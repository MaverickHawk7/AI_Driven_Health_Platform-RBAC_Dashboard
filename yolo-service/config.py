"""
config.py
─────────────────────────────────────────────────────────────────────────────
YOLO service configuration — class names, thresholds, paths.
─────────────────────────────────────────────────────────────────────────────
"""

import os
from pathlib import Path

# Paths

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "ds_indicators.pt"
DATASET_YAML = BASE_DIR / "dataset.yaml"

# Server 

HOST = os.getenv("YOLO_HOST", "0.0.0.0")
PORT = int(os.getenv("YOLO_PORT", "8001"))

# Class names

CLASS_NAMES = [
    "epicanthal_folds",         
    "upward_slanting_eyes",     
    "flat_nasal_bridge",        
    "small_or_unusual_ears",    
    "protruding_tongue",        
    "flat_facial_profile",      
    "short_neck",               
    "brushfield_spots",         
]

# readable labels for explanations
CLASS_LABELS = {
    "epicanthal_folds":       "Epicanthal folds",
    "upward_slanting_eyes":   "Upward slanting eyes",
    "flat_nasal_bridge":      "Flat nasal bridge",
    "small_or_unusual_ears":  "Small or unusual ears",
    "protruding_tongue":      "Protruding tongue",
    "flat_facial_profile":    "Flat facial profile",
    "short_neck":             "Short neck",
    "brushfield_spots":       "Brushfield spots",
}

NUM_CLASSES = len(CLASS_NAMES)

#  Detection thresholds
CONFIDENCE_THRESHOLD = 0.25

# How many distinct indicator classes must be detected for each status
DETECTED_MIN_CLASSES = 3       # 3+ classes → "detected"
INCONCLUSIVE_MIN_CLASSES = 1   # 1-2 classes → "inconclusive"
#                                0 classes   → "not_detected"

# Trng defaults
TRAIN_EPOCHS = 100
TRAIN_IMGSZ = 640
TRAIN_BASE_MODEL = "yolov8n.pt" 
