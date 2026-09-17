import math
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.database import get_db, db_get_products, db_update_product, db_update_anomaly, get_supabase_client

def recalculate_sku_metrics(stock: int, demand30: int, lead_time: int, z_score: float = 1.65) -> Dict[str, Any]:
    """
    Computes Safety Stock and Reorder Point based on supply chain formulas:
    - Daily demand d = demand30 / 30
    - Demand std dev sigma_d approx 20% of daily demand
    - Safety Stock SS = Z * sigma_d * sqrt(lead_time)
    - Reorder Point ROP = (d * lead_time) + SS
    """
    daily_demand = max(1.0, demand30 / 30.0)
    sigma_d = daily_demand * 0.25 # standard variability
    safety_stock = int(math.ceil(z_score * sigma_d * math.sqrt(max(1, lead_time))))
    reorder_point = int(math.ceil((daily_demand * lead_time) + safety_stock))

    # Days of supply remaining
    days_of_supply = round(stock / daily_demand, 1)

    # Determine status
    if stock <= daily_demand * (lead_time * 0.5):
        status = "critical"
    elif stock <= reorder_point:
        status = "warning"
    elif stock >= (reorder_point + 2 * safety_stock + 40):
        status = "overstock"
    else:
        status = "optimal"

    return {
        "safety_stock": safety_stock,
        "reorder_point": reorder_point,
        "days_of_supply": days_of_supply,
        "status": status
    }

def get_all_inventory() -> List[Dict[str, Any]]:
    products = db_get_products()
    result = []
    for p in products:
        d = dict(p)
        daily = max(1.0, d.get("demand30", 30) / 30.0)
        d["days_of_supply"] = round(d.get("stock", 0) / daily, 1)
        d["cost"] = round(d.get("reorder_point", 0) * d.get("unit_cost", 0), 2) if d.get("status") in ["critical", "warning"] else 0.0
        result.append(d)
    return result

def place_reorder(sku: str, quantity: int) -> Dict[str, Any]:
    products = db_get_products()
    matched = [p for p in products if p.get("sku") == sku]

    if not matched:
        raise ValueError(f"Product {sku} not found")

    p = matched[0]
    total_cost = round(quantity * float(p["unit_cost"]), 2)
    order_num = f"PO-{sku[:4]}-{int(datetime.now().timestamp())}"

    # Record in Supabase / SQLite
    sp = get_supabase_client()
    if sp:
        try:
            sp.table("reorder_orders").insert({
                "order_number": order_num,
                "sku": sku,
                "quantity": quantity,
                "unit_cost": float(p["unit_cost"]),
                "total_cost": total_cost,
                "supplier_lead_time": int(p["lead_time"]),
                "order_status": "Pending Shipment"
            }).execute()
        except Exception as e:
            print(f"[Supabase] reorder_order insert error: {e}")

    # Also record in local SQLite
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reorder_orders (order_number, sku, quantity, unit_cost, total_cost, supplier_lead_time, order_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (order_num, sku, quantity, float(p["unit_cost"]), total_cost, int(p["lead_time"]), "Pending Shipment"))
    conn.commit()
    conn.close()

    # Update current stock and recalculate status
    new_stock = int(p["stock"]) + quantity
    metrics = recalculate_sku_metrics(new_stock, int(p["demand30"]), int(p["lead_time"]))
    
    # Update Supabase and SQLite via unified db_update_product
    db_update_product(sku, {
        "stock": new_stock,
        "status": metrics["status"],
        "safety_stock": metrics["safety_stock"],
        "reorder_point": metrics["reorder_point"]
    })

    # Resolve open stockout anomaly for this SKU if any
    db_update_anomaly(f"ANO-002" if sku == "IPH-15PRO" else f"ANO-{sku[:4]}", "resolved")

    return {
        "success": True,
        "order_number": order_num,
        "sku": sku,
        "added_quantity": quantity,
        "new_stock": new_stock,
        "new_status": metrics["status"],
        "total_cost": total_cost,
        "message": f"Successfully placed purchase order {order_num} for {quantity} units of {p['name']}."
    }
