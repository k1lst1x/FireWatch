from __future__ import annotations

import numpy as np
from flwr.app import ArrayRecord, Context, Message, MetricRecord, RecordDict
from flwr.clientapp import ClientApp

from .feedback import STATION_IDS, evaluate, from_vector, load_station_labels, to_vector, train

app = ClientApp()


def _station(context: Context) -> tuple[int, str]:
    cfg = context.node_config
    if "station" in cfg:
        sid = str(cfg["station"])
        return STATION_IDS.index(sid), sid
    idx = int(cfg.get("partition-id", 0)) % len(STATION_IDS)
    return idx, STATION_IDS[idx]


def _params(msg: Message) -> dict:
    return from_vector(msg.content["arrays"].to_numpy_ndarrays()[0])


@app.train()
def local_train(msg: Message, context: Context) -> Message:
    idx, sid = _station(context)
    labels = load_station_labels(sid)
    incoming = _params(msg)
    before = evaluate(incoming, labels)
    new_params, n, after = train(incoming, labels)
    metrics = MetricRecord(
        {
            "num-examples": max(n, 1),
            "station": idx,
            "labels": n,
            "fp_before": before["fp_rate"],
            "miss_before": before["miss_rate"],
            "fp_after": after["fp_rate"],
            "miss_after": after["miss_rate"],
        }
    )
    arrays = ArrayRecord([np.array(to_vector(new_params), dtype=np.float64)])
    return Message(content=RecordDict({"arrays": arrays, "metrics": metrics}), reply_to=msg)


@app.evaluate()
def local_evaluate(msg: Message, context: Context) -> Message:
    idx, sid = _station(context)
    labels = load_station_labels(sid)
    m = evaluate(_params(msg), labels)
    metrics = MetricRecord(
        {
            "num-examples": max(m["n"], 1),
            "station": idx,
            "labels": m["n"],
            "fp_rate": m["fp_rate"],
            "miss_rate": m["miss_rate"],
        }
    )
    return Message(content=RecordDict({"metrics": metrics}), reply_to=msg)
