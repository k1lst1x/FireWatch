from __future__ import annotations

import json
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "gateway"))

from app.federation.feedback import STATIONS_DIR, DEFAULT_PARAMS, evaluate


def lab(rng, cam, det, therm, hot, fire, kind):
    return {
        "camera_conf": round(rng.uniform(*cam), 3),
        "camera_detected": det,
        "thermal_conf": round(rng.uniform(*therm), 3) if hot else 0.0,
        "hotspot": hot,
        "fire": fire,
        "source": "simulated",
        "kind": kind,
    }


def confirmed_fire(rng):
    return lab(rng, (0.6, 0.95), True, (0.65, 0.95), True, 1, "confirmed_fire")


def early_smoke(rng):
    return lab(rng, (0.72, 0.95), True, (0, 0), False, 1, "early_smoke_no_satellite_pass")


def fog(rng):
    return lab(rng, (0.55, 0.78), True, (0, 0), False, 0, "fog_bank")


def sunset(rng):
    return lab(rng, (0.58, 0.76), True, (0, 0), False, 0, "sunset_glare")


def dust(rng):
    return lab(rng, (0.55, 0.72), True, (0, 0), False, 0, "dust_plume")


def weak_fire(rng):
    return lab(rng, (0.1, 0.4), False, (0.5, 0.6), True, 1, "weak_fire_satellite_only")


def controlled_burn(rng):
    return lab(rng, (0.1, 0.3), False, (0.6, 0.66), True, 0, "permitted_burn")


RECIPES = {
    "north_bay": [(confirmed_fire, 8), (early_smoke, 8), (fog, 22), (weak_fire, 2)],
    "sierra": [(confirmed_fire, 10), (early_smoke, 5), (weak_fire, 10), (controlled_burn, 4), (fog, 8)],
    "socal": [(confirmed_fire, 9), (early_smoke, 7), (sunset, 12), (dust, 10), (weak_fire, 2)],
}


def main() -> None:
    for i, (sid, recipe) in enumerate(RECIPES.items()):
        rng = random.Random(1000 + i)
        rows = [dict(fn(rng), station=sid) for fn, count in recipe for _ in range(count)]
        rng.shuffle(rows)
        d = STATIONS_DIR / sid
        d.mkdir(parents=True, exist_ok=True)
        (d / "seed.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
        m = evaluate(DEFAULT_PARAMS, rows)
        print(f"{sid:10s} {len(rows):3d} labels  default fp_rate={m['fp_rate']:.2f} miss_rate={m['miss_rate']:.2f}")


if __name__ == "__main__":
    main()
