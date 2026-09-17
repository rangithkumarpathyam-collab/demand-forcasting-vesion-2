import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

# Optional Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = Any

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "demandai.db")

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Returns initialized Supabase client if URL and KEY are set in environment."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_KEY", "").strip()

    if supabase_url and supabase_key and create_client:
        try:
            _supabase_client = create_client(supabase_url, supabase_key)
            print(f"[Supabase] Connected successfully to {supabase_url}")
            return _supabase_client
        except Exception as e:
            print(f"[Supabase] Connection error: {e}. Falling back to SQLite.")
            return None
    return None

def is_supabase_active() -> bool:
    return get_supabase_client() is not None

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    # Always ensure local SQLite fallback is initialized
    conn = get_db()
    cursor = conn.cursor()

    # 1. Products & Inventory Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        sku TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        stock INTEGER NOT NULL,
        demand30 INTEGER NOT NULL,
        lead_time INTEGER NOT NULL,
        safety_stock INTEGER NOT NULL,
        reorder_point INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Historical Sales Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT,
        sale_date TEXT NOT NULL,
        actual_sales INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Anomalies Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        product TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        deviation TEXT NOT NULL,
        detected TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        impact TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 4. Purchase Reorder Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reorder_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        supplier_lead_time INTEGER NOT NULL,
        order_status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 5. Reports Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        last_run TEXT NOT NULL,
        format TEXT NOT NULL,
        size TEXT NOT NULL,
        status TEXT NOT NULL,
        file_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 6. Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_data_if_empty(conn)
    conn.close()

    # Check Supabase status
    sp = get_supabase_client()
    if sp:
        print("[Database] Primary database: Supabase PostgreSQL (Cloud)")
    else:
        print("[Database] Primary database: Local SQLite (demandai.db)")

def seed_data_if_empty(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        # Seed Products
        products = [
            ('WH-1000XM5', 'Sony WH-1000XM5 Headphones', 'Headphones', 23, 180, 14, 45, 68, 70.0, 'critical'),
            ('IPH-15PRO',  'iPhone 15 Pro 256GB Space Black', 'Smartphones', 8, 95, 21, 30, 113, 500.0, 'critical'),
            ('MBP-14-M3',  'MacBook Pro 14" M3 Pro', 'Laptops', 34, 52, 10, 18, 36, 1200.0, 'optimal'),
            ('SAM-QLED65', 'Samsung 65" QLED Smart TV', 'TVs', 41, 120, 18, 72, 131, 236.6, 'warning'),
            ('DJI-MINI4',  'DJI Mini 4 Pro Drone', 'Drones', 15, 68, 28, 62, 115, 253.6, 'critical'),
            ('APL-WTCH9',  'Apple Watch Series 9 GPS 45mm', 'Wearables', 62, 145, 7, 34, 72, 150.0, 'warning'),
            ('LG-OLED55',  'LG OLED 55" C3 TV', 'TVs', 88, 35, 12, 14, 0, 800.0, 'overstock'),
            ('BOSE-QC45',  'Bose QuietComfort 45', 'Headphones', 210, 42, 10, 14, 0, 140.0, 'overstock'),
            ('GGL-PIX8',   'Google Pixel 8 Pro 128GB', 'Smartphones', 19, 74, 16, 38, 93, 400.0, 'critical'),
            ('AMZN-ECHO4', 'Amazon Echo (4th Gen)', 'Smart Home', 145, 88, 5, 15, 0, 45.0, 'optimal'),
        ]
        cursor.executemany("""
            INSERT INTO products (sku, name, category, stock, demand30, lead_time, safety_stock, reorder_point, unit_cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, products)

        # Seed Sales History
        sales_data = [
            ('Jun 19', 4200), ('Jun 26', 3900), ('Jul 3', 5100), ('Jul 10', 4400),
            ('Jul 17', 4700), ('Jul 24', 4300), ('Jul 31', 4900), ('Aug 7', 5300),
            ('Aug 14', 4600), ('Aug 21', 5000), ('Aug 28', 4800)
        ]
        cursor.executemany("""
            INSERT INTO sales_history (sale_date, actual_sales)
            VALUES (?, ?)
        """, sales_data)

        # Seed Anomalies
        anomalies = [
            ('ANO-001', 'WH-1000XM5', 'Sony WH-1000XM5 Headphones', 'demand_spike', 'critical', '+41.2%',
             'Sep 15, 2026 · 14:32', 'Demand spiked 41% above 30-day rolling average. Likely caused by viral social media review.',
             'open', '$18,400 lost revenue risk', 'Demand Spike'),
            ('ANO-002', 'IPH-15PRO', 'iPhone 15 Pro 256GB Space Black', 'stockout_imminent', 'critical', '8 units remaining',
             'Sep 14, 2026 · 09:10', 'Current stock will be depleted in 2.1 days at current sell-through rate. Lead time is 21 days.',
             'open', '$95,000 stockout exposure', 'Stockout Risk'),
            ('ANO-003', 'LG-OLED55', 'LG OLED 55" C3 TV', 'overstock', 'warning', '251% above safety stock',
             'Sep 13, 2026 · 17:45', 'Inventory level is 2.5× the suggested safety stock. Holding costs accruing at $340/day.',
             'acknowledged', '$34,000 excess holding cost', 'Overstock'),
            ('ANO-004', 'DJI-MINI4', 'DJI Mini 4 Pro Drone', 'lead_time_change', 'warning', '+10 days',
             'Sep 12, 2026 · 11:20', 'Supplier flagged customs delay. Lead time extended from 18 to 28 days. Reorder point recalculated.',
             'open', 'Reorder point raised to 115 units', 'Lead Time Change'),
            ('ANO-005', 'BOSE-QC45', 'Bose QuietComfort 45', 'demand_drop', 'warning', '−28.7%',
             'Sep 11, 2026 · 08:55', 'Sales velocity dropped sharply following competitor price cut. Model confidence reduced to 74%.',
             'acknowledged', '$12,000 markdown risk', 'Demand Drop'),
            ('ANO-006', 'MBP-14-M3', 'MacBook Pro 14" M3 Pro', 'forecast_drift', 'info', '−5.4% MAPE',
             'Sep 10, 2026 · 16:00', 'Model accuracy drifted below threshold. Scheduled retraining triggered automatically.',
             'resolved', 'Model retrained · Accuracy restored to 93.1%', 'Model Drift'),
            ('ANO-007', 'GGL-PIX8', 'Google Pixel 8 Pro 128GB', 'stockout_imminent', 'critical', '19 units remaining',
             'Sep 10, 2026 · 10:30', 'Projected stockout in 7.7 days. Supplier lead time of 16 days makes emergency reorder urgent.',
             'open', '$29,600 revenue at risk', 'Stockout Risk'),
        ]
        cursor.executemany("""
            INSERT INTO anomalies (id, sku, product, type, severity, deviation, detected, description, status, impact, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, anomalies)

        # Seed Reports
        reports = [
            ('RPT-001', 'Weekly Demand Summary', 'Scheduled', 'Sep 14, 2026', 'PDF', '2.1 MB', 'ready'),
            ('RPT-002', 'Stockout Risk Analysis', 'On-Demand', 'Sep 13, 2026', 'XLSX', '840 KB', 'ready'),
            ('RPT-003', 'Forecast vs Actuals — Q3 2026', 'Scheduled', 'Sep 7, 2026', 'PDF', '4.4 MB', 'ready'),
            ('RPT-004', 'Model Performance Metrics', 'Scheduled', 'Sep 1, 2026', 'CSV', '310 KB', 'ready'),
            ('RPT-005', 'Warehouse Utilization Report', 'On-Demand', 'Aug 28, 2026', 'PDF', '1.7 MB', 'generating'),
            ('RPT-006', 'Supplier Lead Time Tracker', 'Scheduled', 'Aug 21, 2026', 'XLSX', '560 KB', 'ready'),
        ]
        cursor.executemany("""
            INSERT INTO reports (id, name, type, last_run, format, size, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, reports)

        # Seed Settings
        settings_map = {
            'organization_name': 'Acme Retail Corp',
            'timezone': 'UTC-6 (CST)',
            'currency': 'USD ($)',
            'forecast_window': '30 days',
            'service_level': '95%',
            'two_factor_auth': 'true',
            'session_timeout': '30 minutes'
        }
        for k, v in settings_map.items():
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))

        conn.commit()

# --- Unified Data Access Helpers (Supabase with SQLite Fallback) ---

def db_get_products() -> List[Dict[str, Any]]:
    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("products").select("*").order("stock").execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"[Supabase] query error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY stock ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_update_product(sku: str, updates: Dict[str, Any]) -> bool:
    sp = get_supabase_client()
    if sp:
        try:
            sp.table("products").update(updates).eq("sku", sku).execute()
        except Exception as e:
            print(f"[Supabase] update error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    set_clauses = [f"{k} = ?" for k in updates.keys()]
    values = list(updates.values()) + [sku]
    cursor.execute(f"UPDATE products SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP WHERE sku = ?", values)
    conn.commit()
    conn.close()
    return True

def db_get_anomalies() -> List[Dict[str, Any]]:
    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("anomalies").select("*").order("created_at", desc=True).execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"[Supabase] anomalies error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM anomalies ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_update_anomaly(anomaly_id: str, new_status: str) -> bool:
    sp = get_supabase_client()
    if sp:
        try:
            sp.table("anomalies").update({"status": new_status}).eq("id", anomaly_id).execute()
        except Exception as e:
            print(f"[Supabase] anomaly update error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE anomalies SET status = ? WHERE id = ?", (new_status, anomaly_id))
    conn.commit()
    conn.close()
    return True

def db_get_sales_history() -> List[Dict[str, Any]]:
    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("sales_history").select("*").order("id").execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"[Supabase] sales_history error: {e}")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT sale_date, actual_sales FROM sales_history ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

