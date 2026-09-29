# config file for the api gateway

# All settings from environment
import os
from dotenv import load_dotenv

load_dotenv()


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    return int(raw)


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    return float(raw)


class Settings:
    # Gateway
    secret_key: str = os.getenv("SECRET_KEY", "change-me-before-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = _env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60)

    # CORS
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]

    # DATABASE
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./firewatch.db")

    # ── AI pipeline ────────────────────────────────────────────────────────────
    # Vision-language model (OpenAI)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    # Camera — ALERTCalifornia (UC San Diego), California camera network:
    #   https://alertcalifornia.org/  |  Partner API token → ALERTCA_API_KEY
    alertca_api_key: str = os.getenv("ALERTCA_API_KEY", "")

    # Satellite — NASA LANCE FIRMS (global; includes CA). Free MAP_KEY:
    #   https://firms.modaps.eosdis.nasa.gov/api/area/
    nasa_firms_map_key: str = os.getenv("NASA_FIRMS_MAP_KEY", "")

    # Weather — OpenWeatherMap current weather (lat/lon; use CA coords for CA incidents):
    #   https://openweathermap.org/api
    openweathermap_api_key: str = os.getenv("OPENWEATHERMAP_API_KEY", "")

    # YOLOv8 weights — accuracy/speed tradeoff (larger custom-trained models: better accuracy, slower).
    yolo_model_path: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    # Inference square size (pixels). Lower = faster, slightly worse small-object accuracy (typ. 320–640).
    yolo_inference_imgsz: int = _env_int("YOLO_INFERENCE_IMGSZ", 640)

    # Collection HTTP — cost/speed vs robustness (fewer attempts = lower tail latency & fewer billed retries).
    collection_http_max_attempts: int = _env_int("COLLECTION_HTTP_MAX_ATTEMPTS", 3)

    # Repeat lat/lon within TTL: skip OpenWeather + FIRMS HTTP (saves API quota & milliseconds).
    # 0 = disabled. Typical: 60–300 for dashboards polling the same incident.
    collection_cache_ttl_sec: int = _env_int("COLLECTION_CACHE_TTL_SEC", 0)

    # FIRMS bbox half-width (degrees). Larger = more context & slightly slower payloads; smaller = tighter / faster.
    firms_bbox_half_deg: float = _env_float("FIRMS_BBOX_HALF_DEG", 0.1)
    # Scale max FRP (MW) to thermal_confidence 1.0 — tune with validation data.
    firms_frp_normalize: float = _env_float("FIRMS_FRP_NORMALIZE", 100.0)

    # Fusion — accuracy vs false positives (higher threshold = fewer CONFIRMED).
    fusion_threshold: float = _env_float("FUSION_THRESHOLD", 0.40)
    # Weight on camera YOLO vs thermal (thermal weight = 1 - this). Sum implied = 1.0.
    fusion_camera_weight: float = _env_float("FUSION_CAMERA_WEIGHT", 0.6)

    # Output – webhook URL for dashboard / push notifications
    dashboard_webhook_url: str = os.getenv("DASHBOARD_WEBHOOK_URL", "")

    # Mock mode – bypasses external API / LLM calls where agents support it (local dev / tests)
    is_mock: bool = os.getenv("IS_MOCK", "false").lower() == "true"

    def __init__(self) -> None:
        w = self.fusion_camera_weight
        if not 0.05 <= w <= 0.95:
            raise ValueError("FUSION_CAMERA_WEIGHT must be between 0.05 and 0.95")
        if self.firms_frp_normalize <= 0:
            raise ValueError("FIRMS_FRP_NORMALIZE must be positive")
        if self.collection_http_max_attempts < 1:
            raise ValueError("COLLECTION_HTTP_MAX_ATTEMPTS must be >= 1")
        if self.yolo_inference_imgsz < 32:
            raise ValueError("YOLO_INFERENCE_IMGSZ must be >= 32")
        if self.access_token_expire_minutes < 1:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be >= 1")


settings = Settings()
