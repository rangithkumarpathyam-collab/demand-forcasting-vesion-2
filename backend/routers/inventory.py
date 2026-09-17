from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.database import db_get_products, db_update_product
from backend.models import ReorderRequest, ProductUpdate
from backend.services.inventory_service import get_all_inventory, place_reorder, recalculate_sku_metrics

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("")
def list_inventory() -> List[Dict[str, Any]]:
    return get_all_inventory()

@router.post("/reorder")
def create_reorder(payload: ReorderRequest) -> Dict[str, Any]:
    try:
        return place_reorder(payload.sku, payload.quantity)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{sku}")
def update_product_inventory(sku: str, payload: ProductUpdate) -> Dict[str, Any]:
    products = db_get_products()
    matched = [p for p in products if p.get("sku") == sku]

    if not matched:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")

    p = matched[0]
    new_stock = payload.stock if payload.stock is not None else int(p.get("stock", 0))
    new_lead = payload.lead_time if payload.lead_time is not None else int(p.get("lead_time", 7))
    new_demand = payload.demand30 if payload.demand30 is not None else int(p.get("demand30", 30))

    metrics = recalculate_sku_metrics(new_stock, new_demand, new_lead)

    updates = {
        "stock": new_stock,
        "lead_time": new_lead,
        "demand30": new_demand,
        "status": metrics["status"],
        "safety_stock": metrics["safety_stock"],
        "reorder_point": metrics["reorder_point"]
    }

    # Updates both Supabase (cloud) and local SQLite
    db_update_product(sku, updates)

    return {
        "sku": sku,
        "stock": new_stock,
        "supabase_updated": True,
        **metrics
    }
