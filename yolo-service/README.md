# YOLO Down Syndrome Indicator Detection Service

Local vision model for detecting facial indicators associated with Down Syndrome. Runs as a FastAPI microservice that the Node.js backend calls as the **primary** photo analyzer (before falling back to OpenRouter cloud LLMs).

## Quick Start

### 1. Install Dependencies

```bash
cd yolo-service
pip install -r requirements.txt
```

### 2. Prepare Dataset

Label images using [LabelImg](https://github.com/HumanSignal/labelImg), [Roboflow](https://roboflow.com), or [CVAT](https://cvat.ai) with these 8 classes:

| ID | Class Name | Description |
|----|-----------|-------------|
| 0 | epicanthal_folds | Skin folds at inner corners of eyes |
| 1 | upward_slanting_eyes | Eyes slanting upward (palpebral fissures) |
| 2 | flat_nasal_bridge | Flattened bridge of the nose |
| 3 | small_or_unusual_ears | Small ears or unusual ear shape |
| 4 | protruding_tongue | Tongue protrusion or open mouth posture |
| 5 | flat_facial_profile | Overall flat facial profile |
| 6 | short_neck | Shortened neck |
| 7 | brushfield_spots | Light-colored spots on the iris |

Place files in YOLO format:

```
datasets/ds_indicators/
├── images/
│   ├── train/    ← training images (.jpg, .png)
│   └── val/      ← validation images
└── labels/
    ├── train/    ← YOLO .txt labels (one per image)
    └── val/
```

**Label format** (one line per detection):
```
<class_id> <x_center> <y_center> <width> <height>
```
All coordinates normalized 0-1 relative to image dimensions.

### 3. Train the Model

```bash
python train.py
```

This uses YOLOv8n as the base model (auto-downloads pretrained weights), trains for 100 epochs, and copies the best weights to `models/ds_indicators.pt`.

### 4. Run the Service

```bash
python server.py
```

The service starts on `http://localhost:8001` by default.

### 5. Start the Node.js Server

```bash
cd ../server
npm run dev
```

The Node.js backend automatically detects the YOLO service and uses it as the primary photo analyzer.

## API Endpoints

### `GET /health`

Returns service status and model availability.

```json
{
  "status": "ok",
  "model_loaded": true,
  "model_path": "/path/to/models/ds_indicators.pt"
}
```

### `POST /predict`

Analyzes a base64-encoded face image.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "status": "detected",
  "confidence": 72,
  "indicators": ["Epicanthal folds", "Flat nasal bridge", "Short neck"],
  "explanation": "Multiple facial indicators observed: ..."
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `YOLO_HOST` | `0.0.0.0` | Host to bind |
| `YOLO_PORT` | `8001` | Port to listen on |

## Architecture

```
Photo Upload → Node.js /api/analyze-photo → visionAnalyzer.ts
                                              │
                            ┌─────────────────┼──────────────────┐
                         1. YOLO           2. OpenRouter       3. Fallback
                         (this service)    (cloud LLMs)       (rule-based)
```

The Node.js backend tries analyzers in order: YOLO → OpenRouter → fallback. The screening never fails — it always returns a result.
