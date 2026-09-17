from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.database import get_db
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
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE sku = ?", (sku,))
    p = cursor.fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")

    p = dict(p)
    new_stock = payload.stock if payload.stock is not None else p["stock"]
    new_lead = payload.lead_time if payload.lead_time is not None else p["lead_time"]
    new_demand = payload.demand30 if payload.demand30 is not None else p["demand30"]

    metrics = recalculate_sku_metrics(new_stock, new_demand, new_lead)

    cursor.execute("""
        UPDATE products
        SET stock = ?, lead_time = ?, demand30 = ?, status = ?, safety_stock = ?, reorder_point = ?, updated_at = CURRENT_TIMESTAMP
        WHERE sku = ?
    """, (new_stock, new_lead, new_demand, metrics["status"], metrics["safety_stock"], metrics["reorder_point"], sku))

    conn.commit()
    conn.close()
    return {"sku": sku, "stock": new_stock, **metrics}
