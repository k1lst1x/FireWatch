"""End-to-end check of the demo's learning moment (script 2:30) against a running backend.

Runs exactly what the presenter does on stage, through the real API:

  1. POST /federation/reset                      -> round 0, default fusion settings
  2. POST /ai/analyze  fog image, no hotspot      -> expect CONFIRMED (false alarm)
  3. POST /ai/incidents/{id}/review  reject       -> dispatcher clicks "False alarm"
  4. POST /federation/round  {"rounds": N}        -> Flower trains the 3 stations
  5. POST /ai/analyze  same fog image again       -> expect DISMISSED
  6. optional live-fire check (Yosemite FIRMS hotspot) -> expect CONFIRMED
  7. POST /federation/reset                      -> leave the demo at round 0

Exit code 0 when the scene works, 1 otherwise.

    uv run python scripts/demo_check.py
    uv run python scripts/demo_check.py --rounds 3 --fire     # also test the live fire at 0:30
    uv run python scripts/demo_check.py --token <jwt>         # when AUTH_REQUIRED=true

Note: step 3 leaves one "rejected" incident in the database, so the dispatcher
label stays after reset. Run scripts/demo_clean.py (backend stopped) before the
real presentation to start from a clean round 0.
"""
from __future__ import annotations

import argparse
import sys
import time

import httpx

FOG = {"lat": 37.9235, "lon": -122.5965, "image_url": "demo_images/fog_demo.jpg"}  # Mt Tamalpais, North Bay
FIRE = {"lat": 37.6528, "lon": -119.6262}  # Yosemite FIRMS hotspot, 29 Sep 2026 (check_setup.py --find-fires)


def call(client: httpx.Client, method: str, path: str, **kw) -> dict:
    r = client.request(method, path, **kw)
    if r.status_code >= 400:
        raise SystemExit(f"{method} {path} -> HTTP {r.status_code}: {r.text[:500]}")
    return r.json()


def show(label: str, d: dict) -> str:
    cam, sat, fus = d.get("camera") or {}, d.get("satellite") or {}, d.get("fusion") or {}
    t = fus.get("telemetry") or {}
    status = fus.get("status")
    print(
        f"  {label}: camera {cam.get('confidence', 0):.3f} ({(cam.get('telemetry') or {}).get('detector')}), "
        f"hotspot={sat.get('hotspot_detected')} thermal {sat.get('thermal_confidence', 0):.2f} -> "
        f"{status}  combined {fus.get('combined_score')} vs threshold {t.get('fusion_threshold')} "
        f"(w_cam {t.get('weight_camera')}, source {t.get('params_source')})"
    )
    return status


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--rounds", type=int, default=3)
    ap.add_argument("--token", help="bearer token, only needed when AUTH_REQUIRED=true")
    ap.add_argument("--fire", action="store_true", help="also check the live fire (Yosemite) is CONFIRMED")
    ap.add_argument("--keep", action="store_true", help="do not reset federation at the end")
    args = ap.parse_args()

    headers = {"Authorization": f"Bearer {args.token}"} if args.token else {}
    ok = True
    with httpx.Client(base_url=args.base, headers=headers, timeout=600) as c:
        print("1. reset federation")
        s = call(c, "POST", "/federation/reset")
        print(f"   round {s['round']}, global {s['global_params']}")

        print("2. analyze fog (before training)")
        a1 = call(c, "POST", "/ai/analyze", json=FOG)
        before = show("before", a1)
        if before != "CONFIRMED":
            ok = False
            print("   !! expected CONFIRMED - check YOLO weights (models/fire_yolov8n.pt) and that the image is demo_images/fog_demo.jpg")

        incident = (a1.get("output") or {}).get("incident_id")
        if before == "CONFIRMED" and incident:
            print(f"3. dispatcher: False alarm on {incident}")
            r = call(c, "POST", f"/ai/incidents/{incident}/review", json={"decision": "reject"})
            print(f"   status {r.get('status')}")
        else:
            print("3. skipped (no pending incident)")

        print(f"4. federated rounds x{args.rounds}")
        t0 = time.time()
        s = call(c, "POST", "/federation/round", json={"rounds": args.rounds})
        for h in s.get("history", []):
            print(f"   round {h['round']}: fp {h['fp_rate']:.3f}  miss {h.get('miss_rate', 0):.3f}")
        print(f"   global {s['global_params']}  ({time.time() - t0:.0f}s)")

        print("5. analyze fog again (after training)")
        after = show("after ", call(c, "POST", "/ai/analyze", json=FOG))
        if after != "DISMISSED":
            ok = False
            print("   !! expected DISMISSED")

        if args.fire:
            print("6. live fire (Yosemite) must still be caught")
            fire = show("fire  ", call(c, "POST", "/ai/analyze", json=FIRE))
            if fire != "CONFIRMED":
                ok = False
                print("   !! expected CONFIRMED - the FIRMS hotspot may have moved; run check_setup.py --find-fires")

        if not args.keep:
            s = call(c, "POST", "/federation/reset")
            print(f"7. reset federation -> round {s['round']}")

    print("\nSCENE OK" if ok else "\nSCENE FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
