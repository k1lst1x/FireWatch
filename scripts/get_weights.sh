#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p models
if [ -f models/fire_yolov8n.pt ]; then echo "models/fire_yolov8n.pt already present"; exit 0; fi
tmp=$(mktemp -d)
git clone --depth 1 -q https://github.com/luminous0219/fire-and-smoke-detection-yolov8 "$tmp/fw"
cp "$tmp/fw/weights/best.pt" models/fire_yolov8n.pt
rm -rf "$tmp"
echo "Saved models/fire_yolov8n.pt (fire + smoke, YOLOv8n, AGPL-3.0)"
