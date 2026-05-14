import cv2
import numpy as np
import onnxruntime as ort
import os

class YOLO_ONNX:
    def __init__(self, model_path, conf=0.25, iou=0.7):
        self.conf = conf
        self.iou = iou

        cuda_options = {
            'cudnn_conv_algo_search': 'EXHAUSTIVE',
            'arena_extend_strategy': 'kSameAsRequested',
        }
        providers = [
            ('CUDAExecutionProvider', cuda_options), 
            'CPUExecutionProvider'
        ]
        
        so = ort.SessionOptions()
        so.log_severity_level = 3
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL 
        
        self.model = ort.InferenceSession(model_path, providers=providers, sess_options=so)
        self.output_details = [i.name for i in self.model.get_outputs()]
        self.input_details = [i.name for i in self.model.get_inputs()]
        
        input_shape = self.model.get_inputs()[0].shape
        self.input_h = input_shape[2] 
        self.input_w = input_shape[3] 
        
        input_type_str = self.model.get_inputs()[0].type
        self.dtype = self._get_np_dtype(input_type_str)
        
        active_providers = self.model.get_providers()
        self.use_gpu = 'CUDAExecutionProvider' in active_providers
        
        if self.use_gpu:
            self.io_binding = self.model.io_binding()
            for name in self.output_details:
                self.io_binding.bind_output(name, 'cuda')

    def _get_np_dtype(self, type_str):
        if 'float16' in type_str: return np.float16
        if 'uint8' in type_str: return np.uint8
        if 'int8' in type_str: return np.int8
        return np.float32 

    def letterbox(self, im, new_shape=(640, 640), color=(114, 114, 114), auto=False, scaleup=True, stride=32):
        shape = im.shape[:2]
        if isinstance(new_shape, int): new_shape = (new_shape, new_shape)
        r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
        if not scaleup: r = min(r, 1.0)

        new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
        dw, dh = (new_shape[1] - new_unpad[0]) / 2, (new_shape[0] - new_unpad[1]) / 2

        if shape[::-1] != new_unpad:
            im = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
        top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
        left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
        im = cv2.copyMakeBorder(im, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
        return im, r, (dw, dh)

    def __call__(self, image: np.ndarray, conf=None, iou=None):
        current_conf = conf if conf is not None else self.conf
        current_iou = iou if iou is not None else self.iou
        
        img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        img, ratio, dwdh = self.letterbox(img, new_shape=(self.input_h, self.input_w), auto=False)
        
        img = img.transpose((2, 0, 1))
        img = np.expand_dims(img, 0)
        img = np.ascontiguousarray(img)

        im = img.astype(self.dtype)
        if self.dtype in [np.float32, np.float16]: 
            im /= 255.0

        if self.use_gpu:
            self.io_binding.clear_binding_inputs()
            inp_ort = ort.OrtValue.ortvalue_from_numpy(im, 'cuda', 0)
            self.io_binding.bind_ortvalue_input(self.input_details[0], inp_ort)
            
            self.model.run_with_iobinding(self.io_binding)
            ort_output = self.io_binding.get_outputs()[0]
            preds = ort_output.numpy()
        else:
            inp = {self.input_details[0]: im}
            preds = self.model.run(self.output_details, inp)[0]

        preds = np.squeeze(preds) 
        preds = preds.T           

        boxes_data = preds[:, :4] 
        scores_data = preds[:, 4:]

        confidences = np.max(scores_data, axis=1)

        mask = confidences > current_conf
        boxes_data = boxes_data[mask]
        confidences = confidences[mask]

        if len(boxes_data) == 0:
            return np.empty((0, 4), dtype=np.int32), np.empty((0,), dtype=np.float32)

        cx, cy, w, h = boxes_data[:, 0], boxes_data[:, 1], boxes_data[:, 2], boxes_data[:, 3]
        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2
        
        boxes_xywh = np.column_stack((x1, y1, w, h))
        boxes_xyxy = np.column_stack((x1, y1, x2, y2))
        
        nms_indices = cv2.dnn.NMSBoxes(boxes_xywh.tolist(), confidences.tolist(), current_conf, current_iou)

        if len(nms_indices) > 0:
            indices = nms_indices.flatten()
            valid_boxes = boxes_xyxy[indices]
            valid_scores = confidences[indices]

            valid_boxes -= np.array(dwdh * 2)
            valid_boxes /= ratio
            valid_boxes = np.round(valid_boxes).astype(np.int32)
            
            h_img, w_img = image.shape[:2]
            valid_boxes[:, [0, 2]] = np.clip(valid_boxes[:, [0, 2]], 0, w_img)
            valid_boxes[:, [1, 3]] = np.clip(valid_boxes[:, [1, 3]], 0, h_img)

            return valid_boxes, valid_scores

        return np.empty((0, 4), dtype=np.int32), np.empty((0,), dtype=np.float32)