-- ==============================================================================
-- DemandAI - Supabase PostgreSQL Database Schema & Initial Data
-- Instructions:
-- 1. Open your Supabase Dashboard: https://app.supabase.com
-- 2. Go to the "SQL Editor" tab on the left navigation
-- 3. Paste this entire script and click "Run"
-- ==============================================================================

-- 1. Products & Inventory Table
CREATE TABLE IF NOT EXISTS public.products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    demand30 INTEGER NOT NULL DEFAULT 0,
    lead_time INTEGER NOT NULL DEFAULT 7,
    safety_stock INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'optimal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Historical Sales Table
CREATE TABLE IF NOT EXISTS public.sales_history (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT,
    sale_date TEXT NOT NULL,
    actual_sales INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Anomalies Table
CREATE TABLE IF NOT EXISTS public.anomalies (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    product TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    deviation TEXT NOT NULL,
    detected TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    impact TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reorder Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.reorder_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    supplier_lead_time INTEGER NOT NULL,
    order_status TEXT NOT NULL DEFAULT 'Pending Shipment',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    last_run TEXT NOT NULL,
    format TEXT NOT NULL,
    size TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    file_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Enable Row Level Security (RLS) & Allow public anon/authenticated read/write
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow full access with anon key (can be restricted per user in production)
CREATE POLICY "Allow anon read-write on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write on sales_history" ON public.sales_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write on anomalies" ON public.anomalies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write on reorder_orders" ON public.reorder_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Seed Initial Products
-- ==============================================================================
INSERT INTO public.products (sku, name, category, stock, demand30, lead_time, safety_stock, reorder_point, unit_cost, status)
VALUES
    ('WH-1000XM5', 'Sony WH-1000XM5 Headphones', 'Headphones', 23, 180, 14, 45, 68, 70.0, 'critical'),
    ('IPH-15PRO',  'iPhone 15 Pro 256GB Space Black', 'Smartphones', 8, 95, 21, 30, 113, 500.0, 'critical'),
    ('MBP-14-M3',  'MacBook Pro 14" M3 Pro', 'Laptops', 34, 52, 10, 18, 36, 1200.0, 'optimal'),
    ('SAM-QLED65', 'Samsung 65" QLED Smart TV', 'TVs', 41, 120, 18, 72, 131, 236.6, 'warning'),
    ('DJI-MINI4',  'DJI Mini 4 Pro Drone', 'Drones', 15, 68, 28, 62, 115, 253.6, 'critical'),
    ('APL-WTCH9',  'Apple Watch Series 9 GPS 45mm', 'Wearables', 62, 145, 7, 34, 72, 150.0, 'warning'),
    ('LG-OLED55',  'LG OLED 55" C3 TV', 'TVs', 88, 35, 12, 14, 0, 800.0, 'overstock'),
    ('BOSE-QC45',  'Bose QuietComfort 45', 'Headphones', 210, 42, 10, 14, 0, 140.0, 'overstock'),
    ('GGL-PIX8',   'Google Pixel 8 Pro 128GB', 'Smartphones', 19, 74, 16, 38, 93, 400.0, 'critical'),
    ('AMZN-ECHO4', 'Amazon Echo (4th Gen)', 'Smart Home', 145, 88, 5, 15, 0, 45.0, 'optimal')
ON CONFLICT (sku) DO NOTHING;

-- Seed Sales History
INSERT INTO public.sales_history (sale_date, actual_sales)
VALUES
    ('Jun 19', 4200), ('Jun 26', 3900), ('Jul 3', 5100), ('Jul 10', 4400),
    ('Jul 17', 4700), ('Jul 24', 4300), ('Jul 31', 4900), ('Aug 7', 5300),
    ('Aug 14', 4600), ('Aug 21', 5000), ('Aug 28', 4800);

-- Seed Anomalies
INSERT INTO public.anomalies (id, sku, product, type, severity, deviation, detected, description, status, impact, category)
VALUES
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
     'open', '$29,600 revenue at risk', 'Stockout Risk')
ON CONFLICT (id) DO NOTHING;

-- Seed Reports
INSERT INTO public.reports (id, name, type, last_run, format, size, status)
VALUES
    ('RPT-001', 'Weekly Demand Summary', 'Scheduled', 'Sep 14, 2026', 'PDF', '2.1 MB', 'ready'),
    ('RPT-002', 'Stockout Risk Analysis', 'On-Demand', 'Sep 13, 2026', 'XLSX', '840 KB', 'ready'),
    ('RPT-003', 'Forecast vs Actuals — Q3 2026', 'Scheduled', 'Sep 7, 2026', 'PDF', '4.4 MB', 'ready'),
    ('RPT-004', 'Model Performance Metrics', 'Scheduled', 'Sep 1, 2026', 'CSV', '310 KB', 'ready'),
    ('RPT-005', 'Warehouse Utilization Report', 'On-Demand', 'Aug 28, 2026', 'PDF', '1.7 MB', 'generating'),
    ('RPT-006', 'Supplier Lead Time Tracker', 'Scheduled', 'Aug 21, 2026', 'XLSX', '560 KB', 'ready')
ON CONFLICT (id) DO NOTHING;

-- Seed Settings
INSERT INTO public.settings (key, value)
VALUES
    ('organization_name', 'Acme Retail Corp'),
    ('timezone', 'UTC-6 (CST)'),
    ('currency', 'USD ($)'),
    ('forecast_window', '30 days'),
    ('service_level', '95%'),
    ('two_factor_auth', 'true'),
    ('session_timeout', '30 minutes')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
