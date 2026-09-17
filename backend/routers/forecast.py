from fastapi import APIRouter, Query
from typing import Dict, Any
from backend.services.forecasting import calculate_forecast, get_seasonality_and_trends

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

@router.get("")
def get_forecast(horizon: str = Query("30d", enum=["7d", "30d", "90d"])) -> Dict[str, Any]:
    forecast = calculate_forecast(horizon=horizon)
    seasonality = get_seasonality_and_trends()
    return {
        **forecast,
        **seasonality
    }
