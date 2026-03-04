

import base64
import io
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import (
    CLASS_LABELS,
    CLASS_NAMES,
    CONFIDENCE_THRESHOLD,
    DETECTED_MIN_CLASSES,
    HOST,
    INCONCLUSIVE_MIN_CLASSES,
    MODEL_PATH,
    PORT,
)



_model = None
_model_loaded = False


def _load_model():
    """Attempt to load the YOLO model. Non-fatal if missing."""
    global _model, _model_loaded

    if not MODEL_PATH.exists():
        print(f"[yolo-service] Model not found at {MODEL_PATH} — running without model")
        return

    try:
        from ultralytics import YOLO
        _model = YOLO(str(MODEL_PATH))
        _model_loaded = True
        print(f"[yolo-service] Model loaded from {MODEL_PATH}")
    except Exception as e:
        print(f"[yolo-service] Failed to load model: {e}")


# ── Lifespan (load model once at startup) ──────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_model()
    yield


# ── App ────────────────────────────────────────────────────────────────────

app = FastAPI(title="YOLO Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    image: str  # base64-encoded image (with or without data URI prefix)


class IndicatorResult(BaseModel):
    class_name: str
    label: str
    confidence: float


class PredictResponse(BaseModel):
    status: str          # "detected" | "not_detected" | "inconclusive"
    confidence: int       # 0-100, overall assessment confidence
    indicators: list[str] # human-readable indicator names
    explanation: str      # clinical summary


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _strip_data_uri(b64: str) -> str:
    """Remove 'data:image/...;base64,' prefix if present."""
    if b64.startswith("data:"):
        _, _, after = b64.partition(",")
        return after
    return b64


def _build_explanation(status: str, indicators: list[str], confidence: int) -> str:
  
    if status == "not_detected":
        return (
            f"No Down Syndrome facial indicators detected (confidence: {confidence}%). "
            "This is a non-diagnostic screening aid only. "
            "A definitive diagnosis requires genetic testing (karyotyping)."
        )
    if status == "inconclusive":
        found = ", ".join(indicators) if indicators else "possible indicators"
        return (
            f"Inconclusive — {found} observed but insufficient for positive screening "
            f"(confidence: {confidence}%). "
            "This is a non-diagnostic screening aid only. "
            "Further evaluation by a specialist is recommended."
        )
    # detected
    found = ", ".join(indicators)
    return (
        f"Multiple facial indicators observed: {found} "
        f"(confidence: {confidence}%). "
        "This is a non-diagnostic screening aid only. "
        "A definitive diagnosis requires genetic testing (karyotyping). "
        "Referral to a specialist is recommended."
    )


# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model_loaded=_model_loaded,
        model_path=str(MODEL_PATH),
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if not _model_loaded or _model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Place a trained model at "
                   f"{MODEL_PATH} and restart the service.",
        )

    # Decode base64 image
    try:
        raw_b64 = _strip_data_uri(req.image)
        image_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

    # Run YOLO inference
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = _model(img, conf=CONFIDENCE_THRESHOLD, verbose=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    # Parse detections
    detected_classes: dict[str, float] = {}  # class_name → max confidence

    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            if 0 <= cls_id < len(CLASS_NAMES):
                name = CLASS_NAMES[cls_id]
                detected_classes[name] = max(detected_classes.get(name, 0), conf)

    # Determine status
    num_detected = len(detected_classes)
    if num_detected >= DETECTED_MIN_CLASSES:
        status = "detected"
    elif num_detected >= INCONCLUSIVE_MIN_CLASSES:
        status = "inconclusive"
    else:
        status = "not_detected"

    # Overall confidence = average of detected class confidences (or 0)
    if detected_classes:
        avg_conf = sum(detected_classes.values()) / len(detected_classes)
        confidence = max(0, min(100, round(avg_conf * 100)))
    else:
        confidence = 85 if num_detected == 0 else 0  # high confidence in "not detected"

    # readable indicator list
    indicators = [CLASS_LABELS[name] for name in detected_classes]

    explanation = _build_explanation(status, indicators, confidence)

    return PredictResponse(
        status=status,
        confidence=confidence,
        indicators=indicators,
        explanation=explanation,
    )


# Entry point 
if __name__ == "__main__":
    print(f"[yolo-service] Starting on {HOST}:{PORT}")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
