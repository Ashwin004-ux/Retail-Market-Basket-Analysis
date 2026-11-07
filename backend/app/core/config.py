from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Retail Market Basket Analyzer"
    API_V1_STR: str = "/api"

    # Runtime settings are also used by the documented .env example and
    # startup command. Uvicorn binds from its CLI; these values remain useful
    # to callers that launch the application programmatically.
    APP_ENV: str = "development"
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    
    # MongoDB Config
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "retail_market_basket"
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]
    
    # App Config
    MAX_UPLOAD_SIZE_MB: int = 25

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore"

settings = Settings()
