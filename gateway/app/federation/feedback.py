from __future__ import annotations

import json
import math
import pathlib
from typing import Iterable

DATA_DIR = pathlib.Path(__file__).resolve().parents[2] / "data"
STATIONS_DIR = DATA_DIR / "stations"

PARAM_KEYS = ("camera_weight", "fusion_threshold", "thermal_only_threshold")
DEFAULT_PARAMS = {"camera_weight": 0.6, "fusion_threshold": 0.40, "thermal_only_threshold": 0.60}
BOUNDS = {
    "camera_weight": (0.30, 0.90),
    "fusion_threshold": (0.20, 0.80),
    "thermal_only_threshold": (0.40, 0.95),
}
STEP = 0.05
MAX_MOVE = 0.10
MISS_PENALTY = 2.0
PROXIMAL_MU = 1.0

STATIONS: dict[str, dict] = {
    "north_bay": {"name": "North Bay", "bbox": [-123.6, 37.8, -122.0, 39.0]},
    "sierra": {"name": "Sierra", "bbox": [-121.0, 36.0, -117.5, 40.5]},
    "socal": {"name": "SoCal", "bbox": [-121.0, 32.5, -114.1, 36.0]},
}
STATION_IDS = list(STATIONS)


def station_for(lat: float, lon: float) -> str:
    for sid, s in STATIONS.items():
        w, so, e, n = s["bbox"]
        if w <= lon <= e and so <= lat <= n:
            return sid

    def dist(sid: str) -> float:
        w, so, e, n = STATIONS[sid]["bbox"]
        return math.hypot((w + e) / 2 - lon, (so + n) / 2 - lat)

    return min(STATIONS, key=dist)


def to_vector(params: dict) -> list[float]:
    return [float(params[k]) for k in PARAM_KEYS]


def from_vector(vec: Iterable[float]) -> dict:
    return {k: round(float(v), 4) for k, v in zip(PARAM_KEYS, vec)}


def decide(params: dict, label: dict) -> bool:
    w = params["camera_weight"]
    combined = label["camera_conf"] * w + label["thermal_conf"] * (1 - w)
    both = bool(label["camera_detected"]) and bool(label["hotspot"])
    thermal_only = bool(label["hotspot"]) and label["thermal_conf"] >= params["thermal_only_threshold"]
    return combined >= params["fusion_threshold"] or both or thermal_only


def evaluate(params: dict, labels: list[dict]) -> dict:
    confirmed = fp = fires = missed = 0
    for lb in labels:
        pred = decide(params, lb)
        fire = int(lb["fire"]) == 1
        if pred:
            confirmed += 1
            if not fire:
                fp += 1
        if fire:
            fires += 1
            if not pred:
                missed += 1
    return {
        "fp_rate": round(fp / confirmed, 4) if confirmed else 0.0,
        "miss_rate": round(missed / fires, 4) if fires else 0.0,
        "n": len(labels),
    }


def _loss(params: dict, labels: list[dict]) -> float:
    m = evaluate(params, labels)
    return m["fp_rate"] + MISS_PENALTY * m["miss_rate"]


def _candidates(key: str, current: float) -> list[float]:
    lo, hi = BOUNDS[key]
    lo = max(lo, current - MAX_MOVE)
    hi = min(hi, current + MAX_MOVE)
    vals, v = [], lo
    while v <= hi + 1e-9:
        vals.append(round(v, 4))
        v += STEP
    if round(current, 4) not in vals:
        vals.append(round(current, 4))
    return sorted(vals, key=lambda x: (abs(x - current), x))


def train(params: dict, labels: list[dict]) -> tuple[dict, int, dict]:
    if not labels:
        return dict(params), 0, evaluate(params, labels)
    start = {k: float(params[k]) for k in PARAM_KEYS}

    def objective(p: dict) -> float:
        return _loss(p, labels) + PROXIMAL_MU * sum(abs(p[k] - start[k]) for k in PARAM_KEYS)

    best = dict(start)
    best_loss = objective(best)
    for _ in range(3):
        improved = False
        for key in PARAM_KEYS:
            for cand in _candidates(key, start[key]):
                trial = {**best, key: cand}
                loss = objective(trial)
                if loss < best_loss - 1e-9:
                    best, best_loss, improved = trial, loss, True
        if not improved:
            break
    best = {k: round(v, 4) for k, v in best.items()}
    return best, len(labels), evaluate(best, labels)


def read_jsonl(path: pathlib.Path) -> list[dict]:
    if not path.is_file():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def load_station_labels(station: str) -> list[dict]:
    d = STATIONS_DIR / station
    return read_jsonl(d / "seed.jsonl") + read_jsonl(d / "dispatcher.jsonl")


def label_from_incident(result: dict, lat: float, lon: float, approved: bool) -> dict:
    cam = result.get("camera") or {}
    sat = result.get("satellite") or {}
    return {
        "station": station_for(lat, lon),
        "camera_conf": float(cam.get("confidence") or 0.0),
        "camera_detected": bool(cam.get("detected")),
        "thermal_conf": float(sat.get("thermal_confidence") or 0.0),
        "hotspot": bool(sat.get("hotspot_detected")),
        "fire": 1 if approved else 0,
        "source": "dispatcher",
    }
