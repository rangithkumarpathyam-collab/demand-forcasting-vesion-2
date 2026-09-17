from fastapi import APIRouter
from typing import List, Dict, Any
from backend.models import AnomalyUpdate
from backend.services.anomaly_service import get_anomalies, update_anomaly_status, run_anomaly_scan

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])

@router.get("")
def list_anomalies() -> List[Dict[str, Any]]:
    return get_anomalies()

@router.patch("/{anomaly_id}")
def update_anomaly(anomaly_id: str, payload: AnomalyUpdate) -> Dict[str, Any]:
    return update_anomaly_status(anomaly_id, payload.status)

@router.post("/scan")
def trigger_anomaly_scan() -> Dict[str, Any]:
    return run_anomaly_scan()
