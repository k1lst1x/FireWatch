from app.services.ai.agents.deliberation import _combine
from app.services.ai.schemas.pipeline import CriticalityLevel, ExpertOpinion


def test_deliberation_marks_material_disagreement():
    result = _combine(
        [
            ExpertOpinion(provider="anthropic", criticality=CriticalityLevel.LOW, score=0.2, rationale="weak signal"),
            ExpertOpinion(provider="nebius", criticality=CriticalityLevel.CRITICAL, score=0.9, rationale="strong spread risk"),
        ]
    )
    assert result.disagreement is True
    assert result.consensus_score == 0.55


def test_deliberation_without_experts_is_explicit():
    result = _combine([])
    assert result.opinions == []
    assert result.consensus_criticality is None
