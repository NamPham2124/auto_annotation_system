import time
from typing import Any
import cv2
import numpy as np
import onnxruntime
import os

def get_onnx_np_dtype(type_str):
    if 'float16' in type_str: return np.float16
    if 'uint8' in type_str: return np.uint8
    if 'int8' in type_str: return np.int8
    return np.float32

class SegmentAnything2ONNX:
    def __init__(self, encoder_model_path, decoder_model_path) -> None:
        self.encoder = SAM2ImageEncoder(encoder_model_path)
        self.decoder = SAM2ImageDecoder(
            decoder_model_path, self.encoder.input_shape[1:3]
        )

    def encode(self, cv_image: np.ndarray) -> dict:
        original_size = cv_image.shape[:2]
        high_res_feats_0, high_res_feats_1, image_embed = self.encoder(cv_image)
        return {
            "high_res_feats_0": high_res_feats_0,
            "high_res_feats_1": high_res_feats_1,
            "image_embedding": image_embed,
            "original_size": original_size,
        }

    def predict_masks(self, embedding, prompt) -> list[np.ndarray]:
        return self.predict_batch(embedding, [prompt])

    def predict_batch(self, embedding, prompts_batch: list[list[dict]]) -> tuple[np.ndarray, np.ndarray]:
        self.decoder.set_image_size(embedding["original_size"])
        
        final_masks = []
        final_scores = []

        for prompt in prompts_batch:
            points = []
            labels = []
            for mark in prompt:
                if mark["type"] == "point":
                    points.append(mark["data"])
                    labels.append(mark["label"])
                elif mark["type"] == "rectangle":
                    points.append([mark["data"][0], mark["data"][1]])
                    points.append([mark["data"][2], mark["data"][3]])
                    labels.append(2)
                    labels.append(3)
            
            batch_points = np.array([points], dtype=self.decoder.dtype)
            batch_labels = np.array([labels], dtype=self.decoder.dtype)

            mask, score = self.decoder(
                embedding["image_embedding"],
                embedding["high_res_feats_0"],
                embedding["high_res_feats_1"],
                batch_points,
                batch_labels,
            )
            
            final_masks.append(mask)
            final_scores.append(score)

        return np.array(final_masks), np.array(final_scores)

class SAM2ImageEncoder:
    def __init__(self, path: str) -> None:
        cuda_options = {'cudnn_conv_algo_search': 'EXHAUSTIVE', 'arena_extend_strategy': 'kSameAsRequested'}
        requested_providers = [
            ('CUDAExecutionProvider', cuda_options), 
            'CPUExecutionProvider'
        ]
        
        so = onnxruntime.SessionOptions()
        so.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        self.session = onnxruntime.InferenceSession(path, sess_options=so, providers=requested_providers)
        active_providers = self.session.get_providers()
        self.use_gpu = 'CUDAExecutionProvider' in active_providers
        
        self.get_input_details()
        self.get_output_details()
        self.dtype = get_onnx_np_dtype(self.input_type_str)

        if self.use_gpu:
            self.io_binding = self.session.io_binding()
            for name in self.output_names:
                self.io_binding.bind_output(name, 'cuda')

    def __call__(self, image: np.ndarray) -> tuple[Any, Any, Any]:
        return self.encode_image(image)

    def encode_image(self, image: np.ndarray):
        input_tensor = self.prepare_input(image)
        outputs = self.infer(input_tensor)
        return outputs[0], outputs[1], outputs[2]

    def prepare_input(self, image: np.ndarray) -> np.ndarray:
        self.img_height, self.img_width = image.shape[:2]
        
        input_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        input_img = cv2.resize(input_img, (self.input_width, self.input_height))

        return input_img[np.newaxis, :, :, :].astype(np.uint8)

    def infer(self, input_tensor: np.ndarray) -> list:
        if self.use_gpu:
            self.io_binding.clear_binding_inputs()
            input_ort = onnxruntime.OrtValue.ortvalue_from_numpy(input_tensor, 'cuda', 0)
            self.io_binding.bind_ortvalue_input(self.input_names[0], input_ort)
            self.session.run_with_iobinding(self.io_binding)
            return self.io_binding.get_outputs()
        else:
            return self.session.run(self.output_names, {self.input_names[0]: input_tensor})

    def get_input_details(self) -> None:
        model_inputs = self.session.get_inputs()
        self.input_names = [model_inputs[i].name for i in range(len(model_inputs))]
        self.input_shape = model_inputs[0].shape
        self.input_height = self.input_shape[1] 
        self.input_width = self.input_shape[2]
        self.input_type_str = model_inputs[0].type

    def get_output_details(self) -> None:
        model_outputs = self.session.get_outputs()
        self.output_names = [model_outputs[i].name for i in range(len(model_outputs))]

class SAM2ImageDecoder:
    def __init__(self, path: str, encoder_input_size: tuple[int, int]) -> None:
        cuda_options = {'cudnn_conv_algo_search': 'EXHAUSTIVE', 'arena_extend_strategy': 'kSameAsRequested'}
        requested_providers = [
            ('CUDAExecutionProvider', cuda_options), 
            'CPUExecutionProvider'
        ]
        
        so = onnxruntime.SessionOptions()
        so.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_ALL
            
        self.session = onnxruntime.InferenceSession(path, sess_options=so, providers=requested_providers)        
        self.use_gpu = 'CUDAExecutionProvider' in self.session.get_providers()

        self.orig_im_size = None
        self.encoder_input_size = encoder_input_size
        self.scale_factor = 4

        self.get_input_details()
        self.get_output_details()
        self.dtype = get_onnx_np_dtype(self.input_type_str)

        if self.use_gpu:
            self.io_binding = self.session.io_binding()
            for name in self.output_names:
                self.io_binding.bind_output(name, 'cuda')

        N = 1
        self.dummy_mask_np = np.zeros((N, 1, self.encoder_input_size[0] // self.scale_factor, self.encoder_input_size[1] // self.scale_factor), dtype=self.dtype)
        self.dummy_has_mask_np = np.zeros((N,), dtype=self.dtype)
        
        if self.use_gpu:
            self.dummy_mask_ort = onnxruntime.OrtValue.ortvalue_from_numpy(self.dummy_mask_np, 'cuda', 0)
            self.dummy_has_mask_ort = onnxruntime.OrtValue.ortvalue_from_numpy(self.dummy_has_mask_np, 'cuda', 0)

        self.fixed_coords_np = np.zeros((1, 3, 2), dtype=self.dtype)
        self.fixed_labels_np = np.zeros((1, 3), dtype=self.dtype) - 1

    def __call__(self, image_embed, high_res_feats_0, high_res_feats_1, point_coords, point_labels):
        inputs = self.prepare_inputs(image_embed, high_res_feats_0, high_res_feats_1, point_coords, point_labels)
        outputs = self.infer(inputs)
        return self.process_output(outputs)

    def prepare_inputs(self, image_embed, high_res_feats_0, high_res_feats_1, point_coords, point_labels):
        input_point_coords, input_point_labels = self.prepare_points(point_coords, point_labels)
        
        if self.use_gpu:
            return (image_embed, high_res_feats_0, high_res_feats_1, input_point_coords, input_point_labels, self.dummy_mask_ort, self.dummy_has_mask_ort)
        else:
            return (image_embed, high_res_feats_0, high_res_feats_1, input_point_coords, input_point_labels, self.dummy_mask_np, self.dummy_has_mask_np)

    def prepare_points(self, point_coords: np.ndarray, point_labels: np.ndarray):
        input_point_coords = point_coords.copy()
        input_point_labels = point_labels.copy()

        input_point_coords[..., 0] = (input_point_coords[..., 0] / self.orig_im_size[1] * self.encoder_input_size[1])
        input_point_coords[..., 1] = (input_point_coords[..., 1] / self.orig_im_size[0] * self.encoder_input_size[0])

        num_input_points = input_point_coords.shape[1]

        self.fixed_coords_np.fill(0)
        self.fixed_labels_np.fill(-1)
        
        points_to_copy = min(num_input_points, 3)
        self.fixed_coords_np[0, :points_to_copy, :] = input_point_coords[0, :points_to_copy, :]
        self.fixed_labels_np[0, :points_to_copy] = input_point_labels[0, :points_to_copy]

        return self.fixed_coords_np, self.fixed_labels_np

    def infer(self, inputs) -> list:
        if self.use_gpu:
            self.io_binding.clear_binding_inputs()
            for i, inp in enumerate(inputs):
                name = self.input_names[i]
                if isinstance(inp, onnxruntime.OrtValue):
                    self.io_binding.bind_ortvalue_input(name, inp)
                else:
                    inp_ort = onnxruntime.OrtValue.ortvalue_from_numpy(inp, 'cuda', 0)
                    self.io_binding.bind_ortvalue_input(name, inp_ort)
                    
            self.session.run_with_iobinding(self.io_binding)
            return self.io_binding.get_outputs()
        else:
            return self.session.run(self.output_names, {self.input_names[i]: inputs[i] for i in range(len(self.input_names))})

    def process_output(self, outputs: list):
        if self.use_gpu:
            scores = outputs[1].numpy()  
            masks = outputs[0].numpy()   
        else:
            scores = outputs[1]
            masks = outputs[0]
            
        best_mask = masks[0, 0]
        
        binary_mask = (best_mask > 0.0).astype(np.uint8) * 255
        output_mask = cv2.resize(binary_mask, (self.orig_im_size[1], self.orig_im_size[0]),interpolation=cv2.INTER_NEAREST)
        
        return output_mask , float(scores[0, 0])

    def set_image_size(self, orig_im_size: tuple[int, int]) -> None:
        self.orig_im_size = orig_im_size

    def get_input_details(self) -> None:
        model_inputs = self.session.get_inputs()
        self.input_names = [model_inputs[i].name for i in range(len(model_inputs))]
        self.input_type_str = model_inputs[0].type

    def get_output_details(self) -> None:
        model_outputs = self.session.get_outputs()
        self.output_names = [model_outputs[i].name for i in range(len(model_outputs))]