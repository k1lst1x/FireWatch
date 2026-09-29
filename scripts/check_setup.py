from __future__ import annotations

import argparse
import asyncio
import csv
import io
import os
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "gateway"))
os.chdir(ROOT)

import httpx
from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
results: list[tuple[str, str, str]] = []


def report(name: str, state: str, detail: str) -> None:
    color = {"OK": GREEN, "FAIL": RED, "SKIP": YELLOW}[state]
    results.append((name, state, detail))
    print(f"  {color}{state:<4}{RESET} {name:<22} {DIM}{detail}{RESET}")


def env(name: str) -> str:
    return (os.getenv(name) or "").strip()


async def check_claude(client: httpx.AsyncClient) -> None:
    key = env("ANTHROPIC_API_KEY")
    if not key:
        return report("LLM (Claude)", "SKIP", "no ANTHROPIC_API_KEY")
    model = env("ANTHROPIC_MODEL") or "claude-sonnet-5-5"
    t = time.perf_counter()
    r = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
        json={"model": model, "max_tokens": 5, "messages": [{"role": "user", "content": "Reply with OK"}]},
    )
    ms = (time.perf_counter() - t) * 1000
    if r.status_code == 200:
        report("LLM (Claude)", "OK", f"{model} replied in {ms:.0f} ms")
    else:
        report("LLM (Claude)", "FAIL", f"HTTP {r.status_code}: {r.text[:120]}")


async def check_openai(client: httpx.AsyncClient) -> None:
    key = env("OPENAI_API_KEY")
    if not key:
        state = "SKIP"
        detail = "no OPENAI_API_KEY" + ("" if env("ANTHROPIC_API_KEY") else " and no Claude key → rule-based fallback")
        return report("LLM (OpenAI)", state, detail)
    base = env("OPENAI_BASE_URL") or "https://api.openai.com/v1"
    model = env("OPENAI_MODEL") or "gpt-4o"
    t = time.perf_counter()
    r = await client.post(
        f"{base.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={"model": model, "messages": [{"role": "user", "content": "Reply with OK"}], "max_tokens": 5},
    )
    ms = (time.perf_counter() - t) * 1000
    if r.status_code == 200:
        report("LLM (OpenAI)", "OK", f"{model} replied in {ms:.0f} ms")
    else:
        report("LLM (OpenAI)", "FAIL", f"HTTP {r.status_code}: {r.text[:120]}")


async def check_firms(client: httpx.AsyncClient) -> None:
    key = env("NASA_FIRMS_MAP_KEY")
    if not key:
        return report("Satellite (FIRMS)", "SKIP", "no NASA_FIRMS_MAP_KEY → thermal score always 0")
    r = await client.get("https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/", params={"MAP_KEY": key})
    if r.status_code != 200 or "transaction_limit" not in r.text:
        return report("Satellite (FIRMS)", "FAIL", f"key rejected: {r.text[:120]}")
    data = r.json()
    report("Satellite (FIRMS)", "OK", f"key valid, {data.get('current_transactions')}/{data.get('transaction_limit')} calls used this window")


async def check_owm(client: httpx.AsyncClient) -> None:
    key = env("OPENWEATHERMAP_API_KEY")
    if not key:
        r = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": 37.5, "longitude": -122, "current": "wind_speed_10m", "wind_speed_unit": "ms"},
        )
        state = "OK" if r.status_code == 200 else "FAIL"
        return report("Weather", state, "no OWM key → Open-Meteo keyless fallback " + ("reachable" if state == "OK" else "UNREACHABLE"))
    r = await client.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"lat": 37.5, "lon": -122, "appid": key, "units": "metric"},
    )
    if r.status_code == 200:
        w = r.json()
        report("Weather (OWM)", "OK", f"wind {w['wind']['speed']} m/s, humidity {w['main']['humidity']}%")
    elif r.status_code == 401:
        report("Weather (OWM)", "FAIL", "401 — new keys can take up to ~2h to activate; Open-Meteo fallback will be used meanwhile")
    else:
        report("Weather (OWM)", "FAIL", f"HTTP {r.status_code}: {r.text[:120]}")


async def check_alertwest(client: httpx.AsyncClient) -> None:
    from app.services.ai.agents import alertwest

    r = await client.get(alertwest.CAMERAS_URL)
    if r.status_code != 200:
        return report("Cameras (AlertWest)", "FAIL", f"HTTP {r.status_code}: {r.text[:120]}")
    payload = r.json()
    root = payload.get("data", payload) if isinstance(payload, dict) else {}
    for part in ("cams", "locs"):
        block = root.get(part) if isinstance(root, dict) else None
        if isinstance(block, dict):
            sample = (block.get("data") or [{}])[0]
            print(f"  {DIM}{part}.key = {str(block.get('key'))[:300]}{RESET}")
            print(f"  {DIM}{part}.data[0] = {str(sample)[:300]}{RESET}")
    cams = alertwest.parse_cameras(payload)
    if not cams:
        return report("Cameras (AlertWest)", "FAIL", "reachable but 0 cameras parsed — send Claude the key/data lines above")
    online = [c for c in cams if not c.offline and c.image_url()]
    near = alertwest.nearest(cams, 38.9, -120.0, 200)
    detail = f"{len(cams)} cameras, {len(online)} online with images"
    if near:
        d, cam = near[0]
        img = await client.get(cam.image_url())
        detail += f"; nearest Tahoe: {cam.name} ({d:.0f} km) image HTTP {img.status_code}"
        if img.status_code != 200:
            return report("Cameras (AlertWest)", "FAIL", detail + f" → {cam.image_url()}")
    report("Cameras (AlertWest)", "OK", detail)


async def check_alertca(client: httpx.AsyncClient) -> None:
    key = env("ALERTCA_API_KEY")
    if not key:
        return report("Cameras (AlertCA)", "SKIP", "not needed — AlertWest public cameras are used instead")
    r = await client.get(
        "https://www.alertcalifornia.org/api/cameras/nearby",
        params={"lat": 37.5, "lon": -122, "radius": 10},
        headers={"Authorization": f"Bearer {key}"},
    )
    ok = r.status_code == 200 and r.headers.get("content-type", "").startswith("application/json")
    report("Cameras (AlertCA)", "OK" if ok else "FAIL", f"HTTP {r.status_code} {r.headers.get('content-type','')}" + ("" if ok else " — endpoint unverified; use image_url instead"))


def check_yolo() -> None:
    weights = pathlib.Path(env("YOLO_MODEL_PATH") or "models/fire_yolov8n.pt")
    if not weights.is_file():
        return report("Fire detector (YOLO)", "FAIL", f"{weights} missing → vision-LLM fallback if key present")
    try:
        from ultralytics import YOLO

        m = YOLO(str(weights))
        img = ROOT / "demo_images" / "smoke_plume.jpg"
        res = m.predict(str(img), verbose=False)[0] if img.is_file() else None
        conf = max((float(b.conf) for b in res.boxes), default=0.0) if res else None
        report("Fire detector (YOLO)", "OK", f"classes {list(m.names.values())}" + (f", demo image conf {conf:.2f}" if conf is not None else ""))
    except Exception as exc:
        report("Fire detector (YOLO)", "FAIL", repr(exc)[:120])


async def find_fires(client: httpx.AsyncClient, bbox: str, days: int, top: int) -> None:
    key = env("NASA_FIRMS_MAP_KEY")
    if not key:
        print(f"\n{YELLOW}Need NASA_FIRMS_MAP_KEY to find live fires.{RESET}")
        return
    print(f"\nLive FIRMS hotspots in {bbox} (last {days} day(s)):")
    rows = []
    for source in ("VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"):
        r = await client.get(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/{bbox}/{days}")
        if r.status_code == 200 and r.text.lower().startswith("latitude"):
            rows += list(csv.DictReader(io.StringIO(r.text)))
    rows = [x for x in rows if x.get("frp")]
    rows.sort(key=lambda x: float(x["frp"]), reverse=True)
    if not rows:
        print("  none found — try a wider bbox (e.g. --bbox world) or --days 3")
        return
    for x in rows[:top]:
        print(f"  lat {float(x['latitude']):.4f}  lon {float(x['longitude']):.4f}  FRP {float(x['frp']):6.1f} MW  {x['acq_date']} {x['acq_time']}  conf={x.get('confidence')}")
    print(f"{DIM}  Use one of these lat/lon pairs in /ai/analyze for a satellite-confirmed demo.{RESET}")


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--find-fires", action="store_true")
    ap.add_argument("--bbox", default="-124.5,32.5,-114.1,42.0")
    ap.add_argument("--days", type=int, default=1)
    ap.add_argument("--top", type=int, default=5)
    a = ap.parse_args()
    if a.bbox == "world":
        a.bbox = "-180,-90,180,90"

    print("BayHawk setup check\n")
    async with httpx.AsyncClient(timeout=20.0) as client:
        for fn in (check_claude, check_openai, check_firms, check_owm, check_alertwest, check_alertca):
            try:
                await fn(client)
            except httpx.HTTPError as exc:
                report(fn.__name__.replace("check_", ""), "FAIL", f"network error: {exc!r}"[:120])
        check_yolo()
        webhook = env("DASHBOARD_WEBHOOK_URL")
        report("Webhook", "OK" if webhook else "SKIP", webhook or "not set → approvals recorded, no webhook sent")
        if a.find_fires:
            await find_fires(client, a.bbox, a.days, a.top)

    fails = [r for r in results if r[1] == "FAIL"]
    print(f"\n{GREEN if not fails else RED}{len(fails)} failing{RESET}, "
          f"{sum(r[1] == 'OK' for r in results)} live, {sum(r[1] == 'SKIP' for r in results)} using fallback")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    asyncio.run(main())
