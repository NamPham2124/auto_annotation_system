import cv2
import numpy as np

def check_green(image,min_green=np.array([25,40,40]), max_green=np.array([70,255,255])):
    # Chuyển ảnh sang HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Tạo mask từ ngưỡng
    mask = cv2.inRange(hsv, min_green, max_green)

    # Xóa nhiễu và làm mịn
    mask = cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((5,5), np.uint8))
    return mask

def find_crop(image, boxes):
    crops, positions = [], []
    for box in boxes:
        x1, y1, x2, y2 = map(int, box)
        crops.append(image[y1:y2, x1:x2].copy())
        positions.append((y1, y2, x1, x2))
    return crops, positions


def mask_full(mask, h, w, position):
    mask_f = np.zeros((h, w), dtype=np.uint8)
    y1, y2, x1, x2 = position
    mask_f[y1:y2, x1:x2] = mask
    return mask_f


def sam2_input(boxes, green):
    # Tính tâm box
    cx = np.clip(((boxes[:, 0] + boxes[:, 2]) / 2).astype(int),0,green.shape[1] - 1)
    cy = np.clip(((boxes[:, 1] + boxes[:, 3]) / 2).astype(int),0,green.shape[0] - 1)

    # Point + label
    points = np.stack([cx, cy], axis=1)
    labels = (green[cy, cx] > 0).astype(np.float32)
    return points, labels


def clean_mask(masks, sam_scores, yolo_scores, thresh=0.5):
    if len(masks) == 0:
        return [], []

    sam_scores = np.array(sam_scores).flatten()
    yolo_scores = np.array(yolo_scores).flatten()

    if yolo_scores.size == 0 or yolo_scores.size != sam_scores.size:
        yolo_scores = np.ones_like(sam_scores)

    combined_scores = sam_scores * yolo_scores
    sorted_indices = np.argsort(combined_scores)[::-1]

    h, w = masks[0].shape[:2]
    occupied_region = np.zeros((h, w), dtype=bool)

    final_masks = []
    final_scores = []

    for idx in sorted_indices:
        current_mask = masks[idx].astype(bool)
        current_area = np.count_nonzero(current_mask)
        cleaned_mask = current_mask & (~occupied_region)
        cleaned_area = np.count_nonzero(cleaned_mask)

        if current_area > 0 and (cleaned_area / current_area) > thresh:
            final_masks.append(cleaned_mask.astype(np.uint8))
            final_scores.append(combined_scores[idx])
            occupied_region |= cleaned_mask
    return final_masks, final_scores

def to_cvat_mask(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return None, None
    contour = max(contours, key=cv2.contourArea)
    xtl, ytl, w, h = cv2.boundingRect(contour)
    xbr, ybr = xtl + w - 1, ytl + h - 1

    polygon = contour.flatten().tolist()
    roi = mask[ytl : ybr + 1, xtl : xbr + 1]
    flattened = roi.flat[:].tolist()
    flattened.extend([xtl, ytl, xbr, ybr])
    return flattened, polygon

def run(image,model1,model2,sam2_onnx, conf1=0.5,iou1=0.5,conf2=0.5,iou2=0.5):
    h, w = image.shape[:2]
    # YOLO 1
    boxes, scores_yolo = model1(image,conf=conf1,iou=iou1)

    # Crop
    crops, positions = find_crop(image, boxes)

    results = []
    masks_all = []
    scores_all = []

    for i in range(len(crops)):
        # SAM2 Encoder
        embeddings = sam2_onnx.encode(crops[i])
        # YOLO 2
        boxes2, scores_y2 = model2(crops[i],conf=conf2,iou=iou2)

        if len(boxes2) == 0:
            continue

        # Point prompt
        greens = check_green(crops[i])
        points, labels = sam2_input(boxes2, greens)

        # SAM2 Decoder
        prompts_batch = [
            [
                {"type": "rectangle", "data": box.tolist()},
                {"type": "point",
                 "data": point.tolist(),
                 "label": int(label)}
            ]
            for box, point, label in zip(boxes2, points, labels)
        ]

        masks, scores_sam = sam2_onnx.predict_batch(embeddings,prompts_batch)

        # Hậu xử lý
        f_masks, f_scores = clean_mask(masks,scores_sam,scores_y2)

        for m, s in zip(f_masks, f_scores):
            masks_all.append(mask_full(m, h, w, positions[i]))
            scores_all.append(s)

    for mask, score in zip(masks_all, scores_all):
        cvat_mask, polygon = to_cvat_mask(mask)
        if cvat_mask is None: continue
        results.append({
            "confidence": str(float(score)),
            "label": "Spinacia",
            "points": polygon,
            "mask": cvat_mask,
            "type": "mask",
        })

    return results