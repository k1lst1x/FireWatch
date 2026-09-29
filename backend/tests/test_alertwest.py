from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.ai.agents import alertwest
from app.services.ai.agents.camera import CameraAgent


def test_image_url_matches_docs_example():
    url = alertwest.build_image_url("12224", "Ridge_Tahoe_NV_1743530801_6917.jpg")
    assert url == "https://img.cdn.prod.alertwest.com/data/img/12224/2025/04/01/Ridge_Tahoe_NV_1743530801_6917.jpg"


PAYLOAD_ABBR_TO_HUMAN = {
    "code": 1,
    "str": "ok",
    "data": {
        "locs": {"key": {"id": "id", "la": "latitude", "lo": "longitude", "n": "name"},
                 "data": [{"id": 7, "la": 39.1, "lo": -120.0, "n": "Tahoe"}, {"id": 8, "la": 34.0, "lo": -118.0, "n": "LA"}]},
        "cams": {"key": {"id": "id", "cn": "cameraName", "lid": "locationId", "img": "image", "off": "offline"},
                 "data": [
                     {"id": 12224, "cn": "Ridge Tahoe", "lid": 7, "img": "Ridge_Tahoe_NV_1743530801_6917.jpg", "off": 0},
                     {"id": 99, "cn": "Dead cam", "lid": 7, "img": "Dead_1743530801_1.jpg", "off": 1},
                     {"id": 5, "cn": "LA cam", "lid": 8, "img": "LA_1743530801_2.jpg", "off": 0},
                 ]},
    },
}

PAYLOAD_HUMAN_TO_ABBR = {
    "data": {
        "locs": {"key": {"id": "i", "lat": "a", "lon": "o"}, "data": [{"i": 7, "a": 39.1, "o": -120.0}]},
        "cams": {"key": {"id": "i", "cameraName": "cn", "locationId": "l", "image": "im"},
                 "data": [{"i": 1, "cn": "X", "l": 7, "im": "X_1743530801_1.jpg"}]},
    }
}


@pytest.mark.parametrize("payload,expected", [(PAYLOAD_ABBR_TO_HUMAN, 3), (PAYLOAD_HUMAN_TO_ABBR, 1)])
def test_parse_both_key_directions(payload, expected):
    cams = alertwest.parse_cameras(payload)
    assert len(cams) == expected
    assert cams[0].lat == 39.1 and cams[0].lon == -120.0
    assert cams[0].image_url().startswith("https://img.cdn.prod.alertwest.com/data/img/")


def test_nearest_skips_offline_and_far():
    cams = alertwest.parse_cameras(PAYLOAD_ABBR_TO_HUMAN)
    near = alertwest.nearest(cams, 39.0, -120.0, 60)
    assert [c.cid for _, c in near] == ["12224"]


async def test_camera_agent_uses_alertwest(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "camera_source", "alertwest")
    alertwest._cache.update(at=0.0, cams=[])
    with (
        patch("app.services.ai.agents.alertwest.httpx_get_json", new_callable=AsyncMock, return_value=PAYLOAD_ABBR_TO_HUMAN),
        patch.object(CameraAgent, "_detect", new_callable=AsyncMock, return_value=(0.77, True, "yolo", None)),
    ):
        r = await CameraAgent().run(lat=39.0, lon=-120.0)
    assert r.detected and r.confidence == 0.77
    assert r.raw["camera"]["name"] == "Ridge Tahoe"
    assert "12224/2025/04/01" in r.image_url


async def test_camera_agent_alertwest_none_nearby(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "camera_source", "alertwest")
    alertwest._cache.update(at=0.0, cams=[])
    with patch("app.services.ai.agents.alertwest.httpx_get_json", new_callable=AsyncMock, return_value=PAYLOAD_ABBR_TO_HUMAN):
        r = await CameraAgent().run(lat=47.6, lon=-122.3)
    assert not r.detected and "no online AlertWest camera" in r.raw["error"]
