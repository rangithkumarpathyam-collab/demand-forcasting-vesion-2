// DemandAI Backend API Client

const API_BASE = '/api';

export interface DashboardSummary {
  kpis: {
    forecast_accuracy: number;
    accuracy_change: string;
    predicted_demand_units: number;
    demand_change: string;
    high_risk_stockouts: number;
    overstock_value: number;
    overstock_skus_count: number;
  };
  sales_data: Array<{
    date: string;
    actual: number | null;
    predicted: number;
    upper: number;
    lower: number;
    trend: number;
  }>;
  top_restock: Array<{
    sku: string;
    name: string;
    stock: number;
    demand: number;
    status: string;
  }>;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  stock: number;
  demand30: number;
  lead_time: number;
  safety_stock: number;
  reorder_point: number;
  unit_cost: number;
  status: 'critical' | 'warning' | 'optimal' | 'overstock';
  days_of_supply: number;
  cost: number;
}

export interface AnomalyItem {
  id: string;
  sku: string;
  product: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  deviation: string;
  detected: string;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  impact: string;
  category: string;
}

export interface ReportItem {
  id: string;
  name: string;
  type: string;
  last_run: string;
  format: string;
  size: string;
  status: string;
}

export const api = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  async getForecast(horizon: '7d' | '30d' | '90d' = '30d') {
    const res = await fetch(`${API_BASE}/forecast?horizon=${horizon}`);
    if (!res.ok) throw new Error('Failed to fetch forecast');
    return res.json();
  },

  async getInventory(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async placeReorder(sku: string, quantity: number) {
    const res = await fetch(`${API_BASE}/inventory/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, quantity }),
    });
    if (!res.ok) throw new Error('Failed to place reorder');
    return res.json();
  },

  async updateInventoryItem(sku: string, data: { stock?: number; lead_time?: number; demand30?: number }) {
    const res = await fetch(`${API_BASE}/inventory/${sku}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update inventory item');
    return res.json();
  },

  async getAnomalies(): Promise<AnomalyItem[]> {
    const res = await fetch(`${API_BASE}/anomalies`);
    if (!res.ok) throw new Error('Failed to fetch anomalies');
    return res.json();
  },

  async updateAnomaly(id: string, status: 'open' | 'acknowledged' | 'resolved') {
    const res = await fetch(`${API_BASE}/anomalies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update anomaly status');
    return res.json();
  },

  async scanAnomalies() {
    const res = await fetch(`${API_BASE}/anomalies/scan`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run anomaly scan');
    return res.json();
  },

  async getReports(): Promise<ReportItem[]> {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async generateReport(name: string, format: string, type: string = 'On-Demand'): Promise<ReportItem> {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, format, type }),
    });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  },

  async chat(message: string): Promise<{ role: string; reply: string }> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to send message to assistant');
    return res.json();
  },

  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async saveSettings(settings: Record<string, string>) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },
};
