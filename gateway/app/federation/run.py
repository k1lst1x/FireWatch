from __future__ import annotations

import argparse
import logging
import os
import pathlib
import sys

GATEWAY = pathlib.Path(__file__).resolve().parents[2]


def main() -> None:
    ap = argparse.ArgumentParser(description="Run FireWatch federated rounds (Flower simulation, one node per station)")
    ap.add_argument("--rounds", type=int, default=1)
    ap.add_argument("--reset", action="store_true")
    a = ap.parse_args()

    os.environ["FEDERATION_ROUNDS"] = str(a.rounds)
    paths = [str(GATEWAY)] + [p for p in os.environ.get("PYTHONPATH", "").split(os.pathsep) if p]
    os.environ["PYTHONPATH"] = os.pathsep.join(dict.fromkeys(paths))
    if str(GATEWAY) not in sys.path:
        sys.path.insert(0, str(GATEWAY))

    from flwr.simulation import run_simulation

    from app.federation.client_app import app as client_app
    from app.federation.feedback import STATION_IDS
    from app.federation.server_app import app as server_app
    from app.federation.state import load_state, reset_state

    if a.reset:
        reset_state()

    run_simulation(
        server_app=server_app,
        client_app=client_app,
        num_supernodes=len(STATION_IDS),
        backend_config={"client_resources": {"num_cpus": 1, "num_gpus": 0.0}},
    )
    s = load_state()
    last = s["history"][-1] if s["history"] else {}
    logging.getLogger("firewatch").warning(
        "round=%s fp_rate=%s global_params=%s", s["round"], last.get("fp_rate"), s["global_params"]
    )


if __name__ == "__main__":
    main()
