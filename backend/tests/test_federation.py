from __future__ import annotations

import json
import os
import subprocess
import sys
import pathlib

import pytest

from app.federation import feedback as fb
from app.services.ai.agents.fusion import FusionAgent
from app.services.ai.schemas.pipeline import CameraResult, ConfirmationStatus, SatelliteResult

ROOT = pathlib.Path(__file__).resolve().parents[2]


def L(cam, det, therm, hot, fire):
    return {"camera_conf": cam, "camera_detected": det, "thermal_conf": therm, "hotspot": hot, "fire": fire}


@pytest.mark.parametrize(
    "label",
    [L(0.9, True, 0.0, False, 1), L(0.3, False, 0.0, False, 0), L(0.2, True, 0.3, True, 1), L(0.0, False, 0.65, True, 1), L(0.5, True, 0.5, False, 0)],
)
async def test_decide_matches_fusion_agent(label, monkeypatch):
    from app.config import settings

    p = fb.DEFAULT_PARAMS
    monkeypatch.setattr(settings, "fusion_camera_weight", p["camera_weight"])
    monkeypatch.setattr(settings, "fusion_threshold", p["fusion_threshold"])
    monkeypatch.setattr(settings, "fusion_thermal_only_threshold", p["thermal_only_threshold"])
    out = await FusionAgent().run(
        camera=CameraResult(confidence=label["camera_conf"], detected=label["camera_detected"]),
        satellite=SatelliteResult(thermal_confidence=label["thermal_conf"], hotspot_detected=label["hotspot"]),
    )
    assert fb.decide(p, label) == (out.status == ConfirmationStatus.CONFIRMED)


def test_station_for_demo_locations():
    assert fb.station_for(37.634, -119.622) == "sierra"
    assert fb.station_for(38.9, -120.0) == "sierra"
    assert fb.station_for(34.32, -117.73) == "socal"
    assert fb.station_for(38.3, -122.5) == "north_bay"
    assert fb.station_for(47.6, -122.3) in fb.STATIONS


def test_train_cuts_fog_false_alarms_without_missing_fires():
    labels = [L(0.72, True, 0.0, False, 0)] * 10 + [L(0.92, True, 0.0, False, 1)] * 5 + [L(0.8, True, 0.8, True, 1)] * 5
    before = fb.evaluate(fb.DEFAULT_PARAMS, labels)
    p = dict(fb.DEFAULT_PARAMS)
    for _ in range(4):
        p, n, after = fb.train(p, labels)
    assert n == 20
    assert before["fp_rate"] > 0.3
    assert after["fp_rate"] < before["fp_rate"]
    assert after["miss_rate"] <= before["miss_rate"]
    for k, (lo, hi) in fb.BOUNDS.items():
        assert lo - 1e-9 <= p[k] <= hi + 1e-9


def test_train_moves_at_most_max_move():
    labels = [L(0.72, True, 0.0, False, 0)] * 20
    p, _, _ = fb.train(fb.DEFAULT_PARAMS, labels)
    for k in fb.PARAM_KEYS:
        assert abs(p[k] - fb.DEFAULT_PARAMS[k]) <= fb.MAX_MOVE + 1e-9


def test_label_from_incident():
    result = {"camera": {"confidence": 0.9, "detected": True}, "satellite": {"thermal_confidence": 0.65, "hotspot_detected": True}}
    lb = fb.label_from_incident(result, 37.634, -119.622, approved=False)
    assert lb == {"station": "sierra", "camera_conf": 0.9, "camera_detected": True, "thermal_conf": 0.65, "hotspot": True, "fire": 0, "source": "dispatcher"}


@pytest.mark.slow
def test_flower_simulation_end_to_end(tmp_path):
    state = tmp_path / "state.json"
    env = {**os.environ, "PYTHONPATH": str(ROOT / "backend"), "FEDERATION_STATE_PATH": str(state)}
    subprocess.run([sys.executable, "scripts/seed_labels.py"], cwd=ROOT, env=env, check=True, capture_output=True)
    r = subprocess.run([sys.executable, "-m", "app.federation.run", "--rounds", "3"], cwd=ROOT, env=env, capture_output=True, text=True, timeout=600)
    assert r.returncode == 0, r.stdout[-2000:] + r.stderr[-2000:]
    s = json.loads(state.read_text())
    assert s["round"] == 3
    assert [h["round"] for h in s["history"]] == [0, 1, 2, 3]
    assert s["history"][-1]["fp_rate"] < s["history"][0]["fp_rate"]
    assert {st["id"] for st in s["stations"] if st["online"]} == set(fb.STATION_IDS)
    assert set(s["history"][-1]["per_station"]) == set(fb.STATION_IDS)
