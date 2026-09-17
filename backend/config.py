import logging
import os
import sys
from pathlib import Path
from typing import List
from dotenv import load_dotenv

logger = logging.getLogger("kohler.config")

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

# Load backend/.env first, then project-root .env. Existing OS env vars win.
_loaded_env_files = []
for env_path in (BACKEND_DIR / ".env", PROJECT_ROOT / ".env"):
    if env_path.is_file():
        load_dotenv(env_path, override=False)
        _loaded_env_files.append(str(env_path))

_PLACEHOLDER_FRAGMENTS = (
    "your-actual-key-here",
    "your_key_here",
    "changeme",
    "replace-me",
)


class Settings:
    PROJECT_NAME: str = "KOHLER AI Bathroom Designer API"
    VERSION: str = "1.0.0"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./kohler.db")

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    OLLAMA_KEEP_ALIVE: str = os.getenv("OLLAMA_KEEP_ALIVE", "60m")

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    API_TIMEOUT_SECONDS: int = 30
    CHAT_RATE_LIMIT: str = "20/5minutes"

    def get_anthropic_api_key(self) -> str:
        key = (
            self.ANTHROPIC_API_KEY
            or os.getenv("ANTHROPIC_API_KEY")
            or os.getenv("CLAUDE_API_KEY")
            or ""
        ).strip()
        self.ANTHROPIC_API_KEY = key
        return key

    def is_anthropic_key_configured(self) -> bool:
        key = self.get_anthropic_api_key()
        if not key or not key.startswith("sk-ant-"):
            return False
        lowered = key.lower()
        return not any(fragment in lowered for fragment in _PLACEHOLDER_FRAGMENTS)

    def is_ollama_available(self) -> bool:
        try:
            import urllib.request
            req = urllib.request.Request(f"{self.OLLAMA_BASE_URL}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    def get_llm_mode(self) -> str:
        if self.is_anthropic_key_configured():
            return "anthropic"
        if self.is_ollama_available():
            return "ollama"
        return "none"

    def is_llm_configured(self) -> bool:
        return self.get_llm_mode() != "none"

    def require_llm_configured(self) -> str:
        """
        Fail loudly at startup if neither Anthropic API key nor local Ollama is configured.
        Silent canned-response fallback is intentionally not permitted.
        """
        mode = self.get_llm_mode()
        loaded = ", ".join(_loaded_env_files) if _loaded_env_files else "none (OS environment only)"
        if mode == "anthropic":
            key = self.get_anthropic_api_key()
            logger.info("ANTHROPIC_API_KEY present (length=%d). Mode: anthropic. Env files loaded: %s", len(key), loaded)
            return "anthropic"
        elif mode == "ollama":
            logger.info("Using local Ollama (%s) at %s. Mode: ollama. Env files loaded: %s", self.OLLAMA_MODEL, self.OLLAMA_BASE_URL, loaded)
            return "ollama"
        else:
            msg = (
                "FATAL: No LLM engine configured. "
                "Either set ANTHROPIC_API_KEY in backend/.env, or ensure Ollama is running at "
                f"{self.OLLAMA_BASE_URL} with model '{self.OLLAMA_MODEL}'. "
                f"Env files loaded: {loaded}. "
                "The API will not start in silent offline/canned-response mode."
            )
            logger.critical(msg)
            print(msg, file=sys.stderr)
            raise RuntimeError(msg)

    def require_anthropic_api_key(self) -> str:
        """Backwards-compatible helper."""
        return self.require_llm_configured()


settings = Settings()
