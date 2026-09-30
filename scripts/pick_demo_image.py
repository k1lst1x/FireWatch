"""Find a "fog-like" demo image for the federated-learning moment of the demo.

The demo shows an alert that fusion CONFIRMS with the default settings and
DISMISSES after a few federated rounds. With no satellite hotspot, that only
happens when the camera's fire/smoke confidence lands in a narrow window:

    default:  0.60 * conf >= 0.40          ->  conf >= ~0.667
    trained:  w * conf    >= threshold     ->  conf >= threshold / w

This script runs the same YOLO weights the camera agent uses on every image in
a folder and prints, for each one, the confidence and both fusion decisions
(computed with the backend's own `decide`). Pick an image marked PERFECT.

    uv run python scripts/pick_demo_image.py demo_images/candidates
    uv run python scripts/pick_demo_image.py demo_images/candidates --trained 0.4632,0.3526,0.5487

Trained params default to the latest global params in the federation state
file, if at least one round has run; otherwise pass --trained.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.federation.feedback import DEFAULT_PARAMS, decide  # noqa: E402

FIRE_CLASSES = {"fire", "smoke"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
PARAM_KEYS = ("camera_weight", "fusion_threshold", "thermal_only_threshold")


def trained_params(arg: str | None) -> dict | None:
    if arg:
        values = [float(v) for v in arg.split(",")]
        if len(values) != 3:
            raise SystemExit("--trained needs 3 comma-separated numbers: camera_weight,fusion_threshold,thermal_only_threshold")
        return dict(zip(PARAM_KEYS, values))
    from app.federation.state import STATE_PATH

    if STATE_PATH.is_file():
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if state.get("round", 0) > 0 and state.get("global_params"):
            return {k: float(state["global_params"][k]) for k in PARAM_KEYS}
    return None


def yolo_confidence(model, path: pathlib.Path, imgsz: int) -> float:
    """Best fire/smoke box confidence, exactly like CameraAgent._run_yolo."""
    best = 0.0
    for r in model.predict(str(path), imgsz=imgsz, verbose=False):
        for box in r.boxes:
            if str(model.names[int(box.cls)]).lower() in FIRE_CLASSES:
                best = max(best, float(box.conf))
    return best


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", type=pathlib.Path, help="folder with candidate images")
    ap.add_argument("--trained", help="camera_weight,fusion_threshold,thermal_only_threshold after training")
    ap.add_argument("--weights", default=os.getenv("YOLO_MODEL_PATH", "models/fire_yolov8n.pt"))
    ap.add_argument("--imgsz", type=int, default=int(os.getenv("YOLO_INFERENCE_IMGSZ", "640")))
    args = ap.parse_args()

    images = sorted(p for p in args.folder.iterdir() if p.suffix.lower() in IMAGE_EXTS)
    if not images:
        raise SystemExit(f"No images in {args.folder}")

    trained = trained_params(args.trained)
    lo = DEFAULT_PARAMS["fusion_threshold"] / DEFAULT_PARAMS["camera_weight"]
    print(f"Default params {DEFAULT_PARAMS}: confirmed when confidence >= {lo:.3f}")
    if trained:
        hi = trained["fusion_threshold"] / trained["camera_weight"]
        print(f"Trained params {trained}: dismissed when confidence < {hi:.3f}")
        print(f"Target window (no satellite hotspot): {lo:.3f} <= confidence < {hi:.3f}\n")
    else:
        print("No trained params yet: run a few federated rounds first, or pass --trained.\n")

    from ultralytics import YOLO

    weights = pathlib.Path(args.weights)
    model = YOLO(str(weights if weights.is_absolute() else ROOT / weights))

    rows = []
    for path in images:
        conf = yolo_confidence(model, path, args.imgsz)
        label = {"camera_conf": conf, "camera_detected": conf > 0, "thermal_conf": 0.0, "hotspot": False}
        before = decide(DEFAULT_PARAMS, label)
        after = decide(trained, label) if trained else None
        verdict = "PERFECT" if before and after is False else ("candidate" if before else "-")
        rows.append((conf, path.name, before, after, verdict))

    print(f"{'confidence':>10}  {'default':>9}  {'trained':>9}  verdict    image")
    for conf, name, before, after, verdict in sorted(rows, reverse=True):
        a = "-" if after is None else ("CONFIRMED" if after else "dismissed")
        print(f"{conf:10.3f}  {'CONFIRMED' if before else 'dismissed':>9}  {a:>9}  {verdict:<9}  {name}")

    if trained and not any(r[4] == "PERFECT" for r in rows):
        print("\nNo image in the window yet. Try foggier or hazier shots, or crop/brighten the ones just below it.")


if __name__ == "__main__":
    main()
