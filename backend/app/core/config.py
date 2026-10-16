import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "CareerPilot AI API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Gemini API settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # CORS settings
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

settings = Settings()
