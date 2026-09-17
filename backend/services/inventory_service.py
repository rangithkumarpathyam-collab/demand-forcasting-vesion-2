import math
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.database import get_db

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
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY stock ASC")
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        # Add days of supply & cost calculation
        daily = max(1.0, d["demand30"] / 30.0)
        d["days_of_supply"] = round(d["stock"] / daily, 1)
        d["cost"] = round(d["reorder_point"] * d["unit_cost"], 2) if d["status"] in ["critical", "warning"] else 0.0
        result.append(d)
    return result

def place_reorder(sku: str, quantity: int) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE sku = ?", (sku,))
    product = cursor.fetchone()

    if not product:
        conn.close()
        raise ValueError(f"Product {sku} not found")

    p = dict(product)
    total_cost = round(quantity * p["unit_cost"], 2)
    order_num = f"PO-{sku[:4]}-{int(datetime.now().timestamp())}"

    cursor.execute("""
        INSERT INTO reorder_orders (order_number, sku, quantity, unit_cost, total_cost, supplier_lead_time, order_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (order_num, sku, quantity, p["unit_cost"], total_cost, p["lead_time"], "Pending Shipment"))

    # Update current stock to reflect incoming order
    new_stock = p["stock"] + quantity
    metrics = recalculate_sku_metrics(new_stock, p["demand30"], p["lead_time"])
    
    cursor.execute("""
        UPDATE products 
        SET stock = ?, status = ?, safety_stock = ?, reorder_point = ?, updated_at = CURRENT_TIMESTAMP
        WHERE sku = ?
    """, (new_stock, metrics["status"], metrics["safety_stock"], metrics["reorder_point"], sku))

    # Also resolve open stockout anomaly for this SKU if any
    cursor.execute("""
        UPDATE anomalies 
        SET status = 'resolved' 
        WHERE sku = ? AND type = 'stockout_imminent' AND status = 'open'
    """, (sku,))

    conn.commit()
    conn.close()

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
