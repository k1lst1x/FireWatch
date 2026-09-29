"""AI agent public exports.

Keep the expensive vision and LLM modules out of the import path for lightweight
routes such as ``/health``, camera browsing, and the integration Settings page.
Those routes should be usable before a developer has installed the optional
model runtime.  The actual classes remain available through the package's
public API and are imported only when requested.
"""

from importlib import import_module
from typing import Any

_AGENTS = {
    "OrchestratorAgent": (".orchestrator", "OrchestratorAgent"),
    "CameraAgent": (".camera", "CameraAgent"),
    "SatelliteAgent": (".satellite", "SatelliteAgent"),
    "WeatherAgent": (".weather", "WeatherAgent"),
    "FusionAgent": (".fusion", "FusionAgent"),
    "ReasoningAgent": (".reasoning", "ReasoningAgent"),
    "ClassificationAgent": (".classification", "ClassificationAgent"),
    "SuggestionAgent": (".suggestion", "SuggestionAgent"),
    "OutputAgent": (".output", "OutputAgent"),
}

__all__ = list(_AGENTS)


def __getattr__(name: str) -> Any:
    """Load an agent implementation only when it is explicitly requested."""
    try:
        module_name, class_name = _AGENTS[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc
    value = getattr(import_module(module_name, __name__), class_name)
    globals()[name] = value
    return value

__all__ = [
    "OrchestratorAgent",
    "CameraAgent",
    "SatelliteAgent",
    "WeatherAgent",
    "FusionAgent",
    "ReasoningAgent",
    "ClassificationAgent",
    "SuggestionAgent",
    "OutputAgent",
]
