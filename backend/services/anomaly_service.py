from typing import List, Dict, Any
from datetime import datetime
from backend.database import get_db

def get_anomalies() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM anomalies ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_anomaly_status(anomaly_id: str, new_status: str) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE anomalies SET status = ? WHERE id = ?", (new_status, anomaly_id))
    conn.commit()
    conn.close()
    return {"id": anomaly_id, "status": new_status, "updated": True}

def run_anomaly_scan() -> Dict[str, Any]:
    """
    Automated statistical scan across products and inventory to identify new anomalies.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    products = [dict(r) for r in cursor.fetchall()]

    new_anomalies = 0
    now_str = datetime.now().strftime("%b %d, %Y · %H:%M")

    for p in products:
        daily_rate = max(1.0, p["demand30"] / 30.0)
        days_left = p["stock"] / daily_rate

        # 1. Imminent stockout scan
        if days_left < (p["lead_time"] * 0.4) and p["stock"] < 25:
            ano_id = f"ANO-AUTO-{p['sku'][:4]}"
            cursor.execute("SELECT id FROM anomalies WHERE id = ?", (ano_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO anomalies (id, sku, product, type, severity, deviation, detected, description, status, impact, category)
                    VALUES (?, ?, ?, 'stockout_imminent', 'critical', ?, ?, ?, 'open', ?, 'Stockout Risk')
                """, (
                    ano_id, p["sku"], p["name"], f"{p['stock']} units left", now_str,
                    f"Current stock will be depleted in {days_left:.1f} days at current velocity. Supplier lead time is {p['lead_time']} days.",
                    f"${int(daily_rate * p['unit_cost'] * p['lead_time']):,} revenue at risk"
                ))
                new_anomalies += 1

    conn.commit()
    conn.close()
    return {"scanned_items": len(products), "new_anomalies_detected": new_anomalies}
