from backend.config import Settings


def test_get_llm_mode_prefers_groq_when_configured(monkeypatch):
    settings = Settings()
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "", raising=False)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_test_key", raising=False)
    monkeypatch.setattr(settings, "is_ollama_available", lambda: False)

    assert settings.get_llm_mode() == "groq"
