"""Wipe local demo state so the presentation starts from a clean round 0.

Stop the backend first. Deletes (if present):
  - firewatch.db                                   incidents, including test "False alarm" clicks
  - backend/data/stations/*/dispatcher.jsonl       dispatcher labels exported from those incidents
  - backend/data/federation_state.json             rounds, learned params, history

Keeps the simulated seed labels (backend/data/stations/*/seed.jsonl).

    uv run python scripts/demo_clean.py          # show what would be deleted
    uv run python scripts/demo_clean.py --yes    # delete
"""
from __future__ import annotations

import argparse
import pathlib
import socket

ROOT = pathlib.Path(__file__).resolve().parents[1]


def backend_running(port: int = 8000) -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--yes", action="store_true", help="actually delete")
    args = ap.parse_args()

    targets = [ROOT / "firewatch.db", ROOT / "backend" / "data" / "federation_state.json"]
    targets += sorted((ROOT / "backend" / "data" / "stations").glob("*/dispatcher.jsonl"))
    targets = [p for p in targets if p.exists()]

    if not targets:
        print("Already clean.")
        return
    if args.yes and backend_running():
        raise SystemExit("Backend is still running on :8000 - stop it first, then re-run.")
    for p in targets:
        print(("deleting " if args.yes else "would delete ") + str(p.relative_to(ROOT)))
        if args.yes:
            p.unlink()
    if not args.yes:
        print("\nRe-run with --yes to delete.")
        return
    print("Done. Start the backend again; GET /federation/status should show round 0 and 40/37/40 labels.")


if __name__ == "__main__":
    main()
