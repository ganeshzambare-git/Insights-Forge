from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Insights Forge Backend"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 20
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email (Brevo transactional API) — required in Phase 4
    BREVO_API_KEY: str = ""
    EMAIL_FROM: str = "no-reply@insightsforge.app"
    EMAIL_FROM_NAME: str = "Insights Forge"
    FRONTEND_URL: str = "http://localhost:5173"
    EMAIL_VERIFY_TOKEN_EXPIRE_HOURS: int = 24
    AUTH_REQUIRE_EMAIL_VERIFICATION: bool = True  # Set to false in .env for dev
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # File Upload
    UPLOAD_DIRECTORY: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    # LLM Settings — Gemini is the only supported provider (no local Ollama).
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemma:2b"
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 2048
    LLM_TIMEOUT: float = 10.0
    LLM_RETRY_COUNT: int = 3
    LLM_STREAMING_ENABLED: bool = True
    LLM_TIMEOUT_CONNECT: float = 2.0
    LLM_TIMEOUT_READ: float = 60.0
    LLM_TIMEOUT_WRITE: float = 10.0
    LLM_MAX_RETRIES: int = 3
    LLM_RETRY_BACKOFF: float = 2.0

    # Gemini specific configurations
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Decision Intelligence settings
    DECISION_CONFIDENCE_WEIGHT_RETRIEVAL: float = 0.35
    DECISION_CONFIDENCE_WEIGHT_LLM: float = 0.35
    DECISION_CONFIDENCE_WEIGHT_EVIDENCE: float = 0.20
    DECISION_CONFIDENCE_WEIGHT_PARSER: float = 0.10

    # Conversation Memory Settings
    MEMORY_RECENT_MESSAGES: int = 10
    MEMORY_SUMMARY_THRESHOLD: int = 10
    MEMORY_MAX_CONTEXT_TOKENS: int = 1000

    # RAG & Embedding Settings
    EMBEDDING_PROVIDER: str = "sentence-transformers"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_VERSION: str = "v1"
    RAG_CHUNK_SIZE: int = 1000
    RAG_CHUNK_OVERLAP: int = 200
    RAG_TOP_K: int = 3
    # Scores come from Chroma as similarity = 1/(1+L2_distance), whose floor for
    # normalized embeddings is ~0.33. A 0.5 cut filtered out genuine matches on
    # short tabular records (they land ~0.38-0.45), leaving retrieval empty and
    # silently falling back to mock context. 0.3 keeps the top_k nearest real rows.
    RAG_SIMILARITY_THRESHOLD: float = 0.3
    RAG_MAX_CONTEXT_TOKENS: int = 1500
    RAG_ENABLE_PREPROCESSING: bool = True
    RAG_ENABLE_STOPWORDS: bool = True
    RAG_ENABLE_FUSION: bool = True
    RAG_ENABLE_DIVERSITY: bool = True
    RAG_DIVERSITY_WEIGHT: float = 0.7
    RAG_SCORE_NORMALIZATION: str = "min-max"
    RAG_METRICS_HISTORY_SIZE: int = 100

    # Vector Store Settings
    VECTOR_PROVIDER: str = "chroma"
    VECTOR_COLLECTION_NAME: str = "apex_analytics_docs"
    VECTOR_DB_DIR: str = "../vector_db"

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
