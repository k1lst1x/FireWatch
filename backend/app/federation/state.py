from __future__ import annotations

import json
import os
import pathlib

from .feedback import DATA_DIR, DEFAULT_PARAMS, STATIONS, load_station_labels

STATE_PATH = pathlib.Path(os.getenv("FEDERATION_STATE_PATH", str(DATA_DIR / "federation_state.json")))

_cache: dict = {"mtime": None, "state": None}


def empty_state() -> dict:
    return {
        "round": 0,
        "running": False,
        "stations": [
            {
                "id": sid,
                "name": s["name"],
                "online": True,
                "bbox": s["bbox"],
                "labels": 0,
                "dispatcher_labels": 0,
                "approvals": 0,
                "rejections": 0,
                "fp_rate": None,
                "miss_rate": None,
                "params": dict(DEFAULT_PARAMS),
            }
            for sid, s in STATIONS.items()
        ],
        "global_params": dict(DEFAULT_PARAMS),
        "history": [],
    }


def load_state() -> dict:
    if not STATE_PATH.is_file():
        return empty_state()
    mtime = STATE_PATH.stat().st_mtime
    if _cache["mtime"] != mtime:
        _cache["state"] = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        _cache["mtime"] = mtime
    return json.loads(json.dumps(_cache["state"]))


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2), encoding="utf-8")
    os.replace(tmp, STATE_PATH)


def reset_state() -> dict:
    state = empty_state()
    save_state(state)
    return state


def global_params() -> dict:
    return load_state().get("global_params") or dict(DEFAULT_PARAMS)


def refresh_label_counts(state: dict) -> dict:
    for s in state["stations"]:
        labels = load_station_labels(s["id"])
        dispatcher = [label for label in labels if label.get("source") == "dispatcher"]
        s["labels"] = len(labels)
        s["dispatcher_labels"] = len(dispatcher)
        s["approvals"] = sum(1 for label in dispatcher if int(label.get("fire", 0)) == 1)
        s["rejections"] = sum(1 for label in dispatcher if int(label.get("fire", 0)) != 1)
    return state
