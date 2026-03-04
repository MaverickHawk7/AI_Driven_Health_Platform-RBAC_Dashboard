
import shutil
import sys
from pathlib import Path

from config import (
    BASE_DIR,
    DATASET_YAML,
    MODEL_PATH,
    TRAIN_BASE_MODEL,
    TRAIN_EPOCHS,
    TRAIN_IMGSZ,
)


def main():
    # Verify dataset exists
    train_images = BASE_DIR / "datasets" / "ds_indicators" / "images" / "train"
    val_images = BASE_DIR / "datasets" / "ds_indicators" / "images" / "val"

    if not train_images.exists() or not any(train_images.iterdir()):
        print(f"ERROR: No training images found at {train_images}")
        print("Place labeled images in datasets/ds_indicators/images/train/")
        sys.exit(1)

    if not val_images.exists() or not any(val_images.iterdir()):
        print(f"WARNING: No validation images found at {val_images}")
        print("Training will proceed but validation metrics won't be available.")

    if not DATASET_YAML.exists():
        print(f"ERROR: dataset.yaml not found at {DATASET_YAML}")
        sys.exit(1)

    print("=" * 60)
    print("  Down Syndrome Indicator YOLO Training")
    print("=" * 60)
    print(f"  Base model:  {TRAIN_BASE_MODEL}")
    print(f"  Epochs:      {TRAIN_EPOCHS}")
    print(f"  Image size:  {TRAIN_IMGSZ}")
    print(f"  Dataset:     {DATASET_YAML}")
    print(f"  Output:      {MODEL_PATH}")
    print("=" * 60)

    # Import and train
    from ultralytics import YOLO

    model = YOLO(TRAIN_BASE_MODEL)  # auto-downloads pretrained weights

    model.train(
        data=str(DATASET_YAML),
        epochs=TRAIN_EPOCHS,
        imgsz=TRAIN_IMGSZ,
        project=str(BASE_DIR / "runs"),
        name="ds_indicators",
        exist_ok=True,
        patience=20,       # early stopping patience
        batch=-1,           # auto batch size
        device="cpu",       # use "0" for GPU if available
        verbose=True,
    )

    # Copy best weights to models/
    best_weights = BASE_DIR / "runs" / "ds_indicators" / "weights" / "best.pt"
    if best_weights.exists():
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best_weights, MODEL_PATH)
        print(f"\nTraining complete! Model saved to: {MODEL_PATH}")
    else:
        print(f"\nWARNING: best.pt not found at {best_weights}")
        # Try last.pt as fallback
        last_weights = BASE_DIR / "runs" / "ds_indicators" / "weights" / "last.pt"
        if last_weights.exists():
            MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(last_weights, MODEL_PATH)
            print(f"Used last.pt instead. Model saved to: {MODEL_PATH}")
        else:
            print("No trained weights found. Check training output for errors.")
            sys.exit(1)

    print("\nNext steps:")
    print("  1. Start the YOLO service:  python server.py")
    print("  2. Start the Node.js server: cd ../server && npm run dev")
    print("  3. Photo analysis will automatically use the local YOLO model.")


if __name__ == "__main__":
    main()
