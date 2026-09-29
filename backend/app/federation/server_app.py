from __future__ import annotations

import os
from collections import defaultdict
from typing import Iterable

import numpy as np
from flwr.app import ArrayRecord, Context, Message
from flwr.serverapp import Grid, ServerApp
from flwr.serverapp.strategy import FedAvg

from .feedback import STATION_IDS, from_vector, to_vector
from .state import load_state, refresh_label_counts, save_state

app = ServerApp()


class RecordingFedAvg(FedAvg):
    def __init__(self, **kw) -> None:
        super().__init__(**kw)
        self.train_log: dict[int, dict[str, dict]] = defaultdict(dict)
        self.eval_log: dict[int, dict[str, dict]] = defaultdict(dict)

    def aggregate_train(self, server_round: int, replies: Iterable[Message]):
        replies = list(replies)
        for r in replies:
            if r.has_error():
                continue
            m = r.content["metrics"]
            sid = STATION_IDS[int(m["station"])]
            local = from_vector(r.content["arrays"].to_numpy_ndarrays()[0])
            self.train_log[server_round][sid] = {**{k: float(v) for k, v in m.items()}, "params": local}
        return super().aggregate_train(server_round, replies)

    def aggregate_evaluate(self, server_round: int, replies: Iterable[Message]):
        replies = list(replies)
        for r in replies:
            if r.has_error():
                continue
            m = r.content["metrics"]
            sid = STATION_IDS[int(m["station"])]
            self.eval_log[server_round][sid] = {k: float(v) for k, v in m.items()}
        return super().aggregate_evaluate(server_round, replies)


def _weighted(per_station: dict[str, dict], key: str) -> float:
    total = sum(max(v.get("labels", 0), 1) for v in per_station.values())
    if not total:
        return 0.0
    return round(sum(v[key] * max(v.get("labels", 0), 1) for v in per_station.values()) / total, 4)


def _num_rounds(context: Context) -> int:
    env = os.getenv("FEDERATION_ROUNDS")
    if env:
        return int(env)
    return int(context.run_config.get("num-server-rounds", 1))


@app.main()
def main(grid: Grid, context: Context) -> None:
    n = len(STATION_IDS)
    state = refresh_label_counts(load_state())
    start_round = int(state.get("round", 0))
    initial = ArrayRecord([np.array(to_vector(state["global_params"]), dtype=np.float64)])

    strategy = RecordingFedAvg(
        fraction_train=1.0,
        fraction_evaluate=1.0,
        min_train_nodes=n,
        min_evaluate_nodes=n,
        min_available_nodes=n,
    )
    num_rounds = _num_rounds(context)
    result = strategy.start(grid=grid, initial_arrays=initial, num_rounds=num_rounds)

    history = state.setdefault("history", [])
    if not history and strategy.train_log.get(1):
        first = strategy.train_log[1]
        history.append(
            {
                "round": start_round,
                "fp_rate": _weighted(first, "fp_before"),
                "miss_rate": _weighted(first, "miss_before"),
                "per_station": {sid: round(v["fp_before"], 4) for sid, v in first.items()},
            }
        )

    for r in range(1, num_rounds + 1):
        ev = strategy.eval_log.get(r, {})
        if not ev:
            continue
        history.append(
            {
                "round": start_round + r,
                "fp_rate": _weighted(ev, "fp_rate"),
                "miss_rate": _weighted(ev, "miss_rate"),
                "per_station": {sid: round(v["fp_rate"], 4) for sid, v in ev.items()},
            }
        )

    if result.arrays is not None:
        state["global_params"] = from_vector(result.arrays.to_numpy_ndarrays()[0])

    last_train = strategy.train_log.get(num_rounds, {})
    last_eval = strategy.eval_log.get(num_rounds, {})
    for s in state["stations"]:
        sid = s["id"]
        s["online"] = sid in last_train
        if sid in last_train:
            s["params"] = last_train[sid]["params"]
            s["labels"] = int(last_train[sid]["labels"])
        if sid in last_eval:
            s["fp_rate"] = round(last_eval[sid]["fp_rate"], 4)
            s["miss_rate"] = round(last_eval[sid]["miss_rate"], 4)

    state["round"] = start_round + num_rounds
    state["running"] = False
    save_state(state)
