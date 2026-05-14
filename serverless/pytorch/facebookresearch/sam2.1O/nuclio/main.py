import json
import base64
import io
import numpy as np
from PIL import Image
import cv2

from yolo_onnx import YOLO_ONNX
from sam2_onnx import SegmentAnything2ONNX
from model_handler import run

def init_context(context):
    context.logger.info("Init context...  0%")
    
    encoder_path = "/opt/nuclio/sam2/sam2.1_hiera_tiny_encoder.onnx"
    decoder_path = "/opt/nuclio/sam2/sam2.1_hiera_tiny_decoder.onnx"
    context.user_data.sam2_onnx = SegmentAnything2ONNX(encoder_path, decoder_path)
    context.user_data.yolo1 = YOLO_ONNX("/opt/nuclio/sam2/yolo1.onnx")
    context.user_data.yolo2 = YOLO_ONNX("/opt/nuclio/sam2/yolo2.onnx")
    
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    
    # Đọc ảnh từ Base64
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf)
    image = image.convert("RGB") 
    image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    # Lấy models từ context
    model1 = context.user_data.yolo1
    model2 = context.user_data.yolo2
    sam2_onnx = context.user_data.sam2_onnx

    results = run(image_np, model1, model2, sam2_onnx,conf1 =0.4,conf2=0.4)
        
    return context.Response(
        body=json.dumps(results), 
        headers={}, 
        content_type='application/json', 
        status_code=200
    )