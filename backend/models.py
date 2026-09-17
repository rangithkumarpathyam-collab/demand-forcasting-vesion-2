from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ProductBase(BaseModel):
    sku: str
    name: str
    category: str
    stock: int
    demand30: int
    lead_time: int
    safety_stock: int
    reorder_point: int
    unit_cost: float
    status: str

class ProductUpdate(BaseModel):
    stock: Optional[int] = None
    lead_time: Optional[int] = None
    demand30: Optional[int] = None

class ReorderRequest(BaseModel):
    sku: str
    quantity: int

class AnomalyUpdate(BaseModel):
    status: str # 'acknowledged' or 'resolved' or 'open'

class ReportGenerateRequest(BaseModel):
    name: str
    format: str # 'PDF', 'XLSX', 'CSV'
    type: Optional[str] = 'On-Demand'

class ChatMessage(BaseModel):
    message: str

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class ForecastPoint(BaseModel):
    date: str
    actual: Optional[int] = None
    predicted: int
    upper: int
    lower: int
    trend: int

class ForecastResponse(BaseModel):
    horizon: str
    data: List[ForecastPoint]
    mape: float
    rmse: float
    trend_direction: str
