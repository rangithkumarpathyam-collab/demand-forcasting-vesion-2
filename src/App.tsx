import React, { useState, useMemo, createContext, useContext } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { api } from './services/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'dashboard' | 'analytics' | 'inventory' | 'anomalies' | 'reports' | 'settings'
type ChartFilter = 'All' | 'Trend Only' | 'Seasonality' | 'Anomalies'
type TimeHorizon = '7d' | '30d' | '90d'

// ─── Color tokens ─────────────────────────────────────────────────────────────

const C = {
  text:       '#1e293b',
  textMid:    '#475569',
  textSub:    '#94a3b8',
  border:     'rgba(148,163,184,0.25)',
  borderMid:  'rgba(148,163,184,0.45)',
  emerald:    '#059669', emeraldBg: 'rgba(16,185,129,0.10)', emeraldBdr: 'rgba(16,185,129,0.25)',
  amber:      '#d97706', amberBg:   'rgba(245,158,11,0.10)', amberBdr:   'rgba(245,158,11,0.30)',
  crimson:    '#dc2626', crimsonBg: 'rgba(239,68,68,0.10)',  crimsonBdr: 'rgba(239,68,68,0.25)',
  indigo:     '#6366f1', indigoBg:  'rgba(99,102,241,0.10)', indigoBdr:  'rgba(99,102,241,0.25)',
  violet:     '#7c3aed', violetBg:  'rgba(124,58,237,0.08)', violetBdr:  'rgba(124,58,237,0.25)',
  sky:        '#0ea5e9', skyBg:     'rgba(14,165,233,0.10)', skyBdr:     'rgba(14,165,233,0.25)',
}

// ─── Theme context ────────────────────────────────────────────────────────────

type Density = 'Compact' | 'Standard' | 'Comfortable'

const ThemeCtx = createContext<{ darkMode: boolean; density: Density }>({ darkMode: false, density: 'Standard' })
const useTheme = () => useContext(ThemeCtx)

// Dark-mode overrides applied to the root wrapper via inline CSS vars
const darkVars: React.CSSProperties = {
  // backgrounds
  ['--dm-bg'  as string]: '#0b0f1a',
  ['--dm-s1'  as string]: 'rgba(17,24,39,0.85)',
  ['--dm-s2'  as string]: 'rgba(26,34,53,0.75)',
  ['--dm-sb'  as string]: 'rgba(13,19,32,0.90)',
  ['--dm-hdr' as string]: 'rgba(13,19,32,0.90)',
  // borders
  ['--dm-bd'  as string]: 'rgba(30,45,69,0.8)',
  ['--dm-bd2' as string]: 'rgba(36,51,82,0.9)',
  // text
  ['--dm-tx'  as string]: '#e2e8f0',
  ['--dm-tm'  as string]: '#94a3b8',
  ['--dm-ts'  as string]: '#475569',
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const salesData = [
  { date: 'Jun 19', actual: 4200, predicted: 4100, upper: 4600, lower: 3700, trend: 4050 },
  { date: 'Jun 26', actual: 3900, predicted: 4050, upper: 4500, lower: 3600, trend: 4080 },
  { date: 'Jul 3',  actual: 5100, predicted: 4300, upper: 4800, lower: 3800, trend: 4110 },
  { date: 'Jul 10', actual: 4400, predicted: 4350, upper: 4850, lower: 3850, trend: 4140 },
  { date: 'Jul 17', actual: 4700, predicted: 4500, upper: 5000, lower: 4000, trend: 4170 },
  { date: 'Jul 24', actual: 4300, predicted: 4480, upper: 4980, lower: 3980, trend: 4200 },
  { date: 'Jul 31', actual: 4900, predicted: 4600, upper: 5100, lower: 4100, trend: 4230 },
  { date: 'Aug 7',  actual: 5300, predicted: 4750, upper: 5250, lower: 4250, trend: 4260 },
  { date: 'Aug 14', actual: 4600, predicted: 4800, upper: 5300, lower: 4300, trend: 4290 },
  { date: 'Aug 21', actual: 5000, predicted: 4900, upper: 5400, lower: 4400, trend: 4320 },
  { date: 'Aug 28', actual: 4800, predicted: 4950, upper: 5450, lower: 4450, trend: 4350 },
  { date: 'Sep 4',  actual: null, predicted: 5100, upper: 5700, lower: 4500, trend: 4380 },
  { date: 'Sep 11', actual: null, predicted: 5250, upper: 5900, lower: 4600, trend: 4410 },
  { date: 'Sep 18', actual: null, predicted: 5400, upper: 6100, lower: 4700, trend: 4440 },
]

const topRestockItems = [
  { sku: 'WH-1000XM5', name: 'Sony WH-1000XM5 Headphones',   stock: 23, demand: 180, status: 'critical' },
  { sku: 'IPH-15PRO',  name: 'iPhone 15 Pro 256GB Space Black', stock: 8, demand: 95,  status: 'critical' },
  { sku: 'SAM-QLED65', name: 'Samsung 65" QLED Smart TV',     stock: 41, demand: 120, status: 'warning'  },
  { sku: 'DJI-MINI4',  name: 'DJI Mini 4 Pro Drone',          stock: 15, demand: 68,  status: 'warning'  },
  { sku: 'APL-WTCH9',  name: 'Apple Watch Series 9 GPS 45mm', stock: 62, demand: 145, status: 'warning'  },
]

const inventoryData = [
  { sku: 'WH-1000XM5', name: 'Sony WH-1000XM5 Headphones', stock: 23,  demand30: 180, lead: 14, safety: 45, reorder: 68,  status: 'critical', cost: 12600 },
  { sku: 'IPH-15PRO',  name: 'iPhone 15 Pro 256GB',         stock: 8,   demand30: 95,  lead: 21, safety: 30, reorder: 113, status: 'critical', cost: 47500 },
  { sku: 'MBP-14-M3',  name: 'MacBook Pro 14" M3 Pro',      stock: 34,  demand30: 52,  lead: 10, safety: 18, reorder: 36,  status: 'optimal',  cost: 0 },
  { sku: 'SAM-QLED65', name: 'Samsung 65" QLED TV',         stock: 41,  demand30: 120, lead: 18, safety: 72, reorder: 131, status: 'warning',  cost: 28400 },
  { sku: 'DJI-MINI4',  name: 'DJI Mini 4 Pro Drone',        stock: 15,  demand30: 68,  lead: 28, safety: 62, reorder: 115, status: 'critical', cost: 17250 },
  { sku: 'APL-WTCH9',  name: 'Apple Watch Series 9 45mm',   stock: 62,  demand30: 145, lead: 7,  safety: 34, reorder: 72,  status: 'warning',  cost: 21750 },
  { sku: 'LG-OLED55',  name: 'LG OLED 55" C3 TV',           stock: 88,  demand30: 35,  lead: 12, safety: 14, reorder: 0,   status: 'overstock', cost: 0 },
  { sku: 'BOSE-QC45',  name: 'Bose QuietComfort 45',        stock: 210, demand30: 42,  lead: 10, safety: 14, reorder: 0,   status: 'overstock', cost: 0 },
  { sku: 'GGL-PIX8',   name: 'Google Pixel 8 Pro 128GB',    stock: 19,  demand30: 74,  lead: 16, safety: 38, reorder: 93,  status: 'critical', cost: 29600 },
  { sku: 'AMZN-ECHO4', name: 'Amazon Echo (4th Gen)',       stock: 145, demand30: 88,  lead: 5,  safety: 15, reorder: 0,   status: 'optimal',  cost: 0 },
]

const anomalyDetailData = [
  { date: 'Jun 19', sales: 4200, anomaly: null },
  { date: 'Jun 26', sales: 3900, anomaly: null },
  { date: 'Jul 3',  sales: 5100, anomaly: 5100 },
  { date: 'Jul 10', sales: 4400, anomaly: null },
  { date: 'Jul 17', sales: 4700, anomaly: null },
  { date: 'Jul 24', sales: 4300, anomaly: null },
  { date: 'Jul 31', sales: 4900, anomaly: null },
  { date: 'Aug 7',  sales: 5300, anomaly: 5300 },
  { date: 'Aug 14', sales: 4600, anomaly: null },
  { date: 'Aug 21', sales: 5000, anomaly: null },
  { date: 'Aug 28', sales: 4800, anomaly: null },
]

const trendData = [
  { date: 'Jun 19', trend: 4050 }, { date: 'Jun 26', trend: 4080 },
  { date: 'Jul 3',  trend: 4110 }, { date: 'Jul 10', trend: 4140 },
  { date: 'Jul 17', trend: 4170 }, { date: 'Jul 24', trend: 4200 },
  { date: 'Jul 31', trend: 4230 }, { date: 'Aug 7',  trend: 4260 },
  { date: 'Aug 14', trend: 4290 }, { date: 'Aug 21', trend: 4320 },
  { date: 'Aug 28', trend: 4350 },
]

const seasonalData = [
  { week: 'W1', factor: 0.92 }, { week: 'W2', factor: 1.05 },
  { week: 'W3', factor: 0.88 }, { week: 'W4', factor: 1.18 },
  { week: 'W5', factor: 0.95 }, { week: 'W6', factor: 1.12 },
  { week: 'W7', factor: 0.84 }, { week: 'W8', factor: 1.31 },
  { week: 'W9', factor: 0.91 }, { week: 'W10', factor: 1.08 },
  { week: 'W11', factor: 0.96 }, { week: 'W12', factor: 1.45 },
]

// anomaly alerts mock
const anomalyEvents = [
  {
    id: 'ANO-001', sku: 'WH-1000XM5', product: 'Sony WH-1000XM5 Headphones',
    type: 'demand_spike', severity: 'critical', deviation: '+41.2%',
    detected: 'Sep 15, 2026 · 14:32', description: 'Demand spiked 41% above 30-day rolling average. Likely caused by viral social media review.',
    status: 'open', impact: '$18,400 lost revenue risk', category: 'Demand Spike',
  },
  {
    id: 'ANO-002', sku: 'IPH-15PRO', product: 'iPhone 15 Pro 256GB',
    type: 'stockout_imminent', severity: 'critical', deviation: '8 units remaining',
    detected: 'Sep 14, 2026 · 09:10', description: 'Current stock will be depleted in 2.1 days at current sell-through rate. Lead time is 21 days.',
    status: 'open', impact: '$95,000 stockout exposure', category: 'Stockout Risk',
  },
  {
    id: 'ANO-003', sku: 'LG-OLED55', product: 'LG OLED 55" C3 TV',
    type: 'overstock', severity: 'warning', deviation: '251% above safety stock',
    detected: 'Sep 13, 2026 · 17:45', description: 'Inventory level is 2.5× the suggested safety stock. Holding costs accruing at $340/day.',
    status: 'acknowledged', impact: '$34,000 excess holding cost', category: 'Overstock',
  },
  {
    id: 'ANO-004', sku: 'DJI-MINI4', product: 'DJI Mini 4 Pro Drone',
    type: 'lead_time_change', severity: 'warning', deviation: '+10 days',
    detected: 'Sep 12, 2026 · 11:20', description: 'Supplier flagged customs delay. Lead time extended from 18 to 28 days. Reorder point recalculated.',
    status: 'open', impact: 'Reorder point raised to 115 units', category: 'Lead Time Change',
  },
  {
    id: 'ANO-005', sku: 'BOSE-QC45', product: 'Bose QuietComfort 45',
    type: 'demand_drop', severity: 'warning', deviation: '−28.7%',
    detected: 'Sep 11, 2026 · 08:55', description: 'Sales velocity dropped sharply following competitor price cut. Model confidence reduced to 74%.',
    status: 'acknowledged', impact: '$12,000 markdown risk', category: 'Demand Drop',
  },
  {
    id: 'ANO-006', sku: 'MBP-14-M3', product: 'MacBook Pro 14" M3 Pro',
    type: 'forecast_drift', severity: 'info', deviation: '−5.4% MAPE',
    detected: 'Sep 10, 2026 · 16:00', description: 'Model accuracy drifted below threshold. Scheduled retraining triggered automatically.',
    status: 'resolved', impact: 'Model retrained · Accuracy restored to 93.1%', category: 'Model Drift',
  },
  {
    id: 'ANO-007', sku: 'GGL-PIX8', product: 'Google Pixel 8 Pro 128GB',
    type: 'stockout_imminent', severity: 'critical', deviation: '19 units remaining',
    detected: 'Sep 10, 2026 · 10:30', description: 'Projected stockout in 7.7 days. Supplier lead time of 16 days makes emergency reorder urgent.',
    status: 'open', impact: '$29,600 revenue at risk', category: 'Stockout Risk',
  },
]

const anomalySparkData = [
  { t: '1', v: 4200 }, { t: '2', v: 4100 }, { t: '3', v: 3950 },
  { t: '4', v: 4300 }, { t: '5', v: 6100 }, { t: '6', v: 4400 },
  { t: '7', v: 4600 }, { t: '8', v: 7200 }, { t: '9', v: 4800 },
  { t: '10', v: 4700 },
]

// reports mock
const reportRevData = [
  { month: 'Apr', revenue: 182000, forecast: 175000 },
  { month: 'May', revenue: 198000, forecast: 190000 },
  { month: 'Jun', revenue: 176000, forecast: 185000 },
  { month: 'Jul', revenue: 214000, forecast: 208000 },
  { month: 'Aug', revenue: 231000, forecast: 222000 },
  { month: 'Sep', revenue: null,   forecast: 248000 },
]

const accuracyData = [
  { week: 'W1', mape: 4.2 }, { week: 'W2', mape: 5.8 }, { week: 'W3', mape: 3.9 },
  { week: 'W4', mape: 6.1 }, { week: 'W5', mape: 4.7 }, { week: 'W6', mape: 3.2 },
  { week: 'W7', mape: 5.3 }, { week: 'W8', mape: 4.0 }, { week: 'W9', mape: 3.6 },
  { week: 'W10', mape: 4.9 }, { week: 'W11', mape: 3.1 }, { week: 'W12', mape: 5.3 },
]

const categoryShareData = [
  { category: 'Headphones', units: 3200, pct: 28 },
  { category: 'Smartphones', units: 2400, pct: 21 },
  { category: 'TVs', units: 1800, pct: 16 },
  { category: 'Wearables', units: 1600, pct: 14 },
  { category: 'Laptops', units: 1100, pct: 10 },
  { category: 'Drones', units: 640,  pct: 6  },
  { category: 'Smart Home', units: 580,  pct: 5  },
]

const modelRadarData = [
  { metric: 'Accuracy', score: 94 },
  { metric: 'Recall',   score: 88 },
  { metric: 'Precision', score: 91 },
  { metric: 'F1-Score', score: 89 },
  { metric: 'Coverage', score: 96 },
  { metric: 'Stability', score: 82 },
]

const reportsList = [
  { id: 'RPT-001', name: 'Weekly Demand Summary', type: 'Scheduled', lastRun: 'Sep 14, 2026', format: 'PDF', size: '2.1 MB', status: 'ready' },
  { id: 'RPT-002', name: 'Stockout Risk Analysis', type: 'On-Demand', lastRun: 'Sep 13, 2026', format: 'XLSX', size: '840 KB', status: 'ready' },
  { id: 'RPT-003', name: 'Forecast vs Actuals — Q3 2026', type: 'Scheduled', lastRun: 'Sep 7, 2026', format: 'PDF', size: '4.4 MB', status: 'ready' },
  { id: 'RPT-004', name: 'Model Performance Metrics', type: 'Scheduled', lastRun: 'Sep 1, 2026', format: 'CSV', size: '310 KB', status: 'ready' },
  { id: 'RPT-005', name: 'Warehouse Utilization Report', type: 'On-Demand', lastRun: 'Aug 28, 2026', format: 'PDF', size: '1.7 MB', status: 'generating' },
  { id: 'RPT-006', name: 'Supplier Lead Time Tracker', type: 'Scheduled', lastRun: 'Aug 21, 2026', format: 'XLSX', size: '560 KB', status: 'ready' },
]

// ─── Shared Primitives ────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; border: string; dot: string; text: string; label: string }> = {
    critical:  { bg: C.crimsonBg, border: C.crimsonBdr, dot: C.crimson, text: C.crimson, label: 'Critical' },
    warning:   { bg: C.amberBg,   border: C.amberBdr,   dot: C.amber,   text: C.amber,   label: 'At Risk' },
    optimal:   { bg: C.emeraldBg, border: C.emeraldBdr, dot: C.emerald, text: C.emerald, label: 'Optimal' },
    overstock: { bg: C.violetBg,  border: C.violetBdr,  dot: C.violet,  text: C.violet,  label: 'Overstocked' },
  }
  const s = map[status] ?? map.optimal
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      <span className={`w-1.5 h-1.5 rounded-full${status === 'critical' ? ' pulse-dot' : ''}`} style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-2xl shadow-xl text-xs font-mono overflow-hidden" style={{ minWidth: 160 }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #7c3aed)', width: '100%' }} />
      <div className="p-3">
        <p className="mb-2 font-semibold" style={{ color: C.textMid }}>{label}</p>
        <div style={{ height: 1, background: 'rgba(148,163,184,0.18)', marginBottom: 8 }} />
        {payload.map((p: any) => p.value != null && (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: C.textSub }}>{p.name}:</span>
            <span className="font-bold" style={{ color: C.text }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick, badge }: { icon: string; label: string; active: boolean; onClick: () => void; badge?: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer relative overflow-hidden"
      style={{
        paddingLeft: 12, paddingRight: 12,
        background: active
          ? 'linear-gradient(90deg,rgba(99,102,241,0.18) 0%,rgba(99,102,241,0.07) 100%)'
          : hovered ? 'rgba(99,102,241,0.06)' : 'transparent',
        color: active ? C.indigo : hovered ? C.textMid : C.textSub,
        border: 'none',
        fontWeight: active ? 700 : 500,
        boxShadow: active ? 'inset 3px 0 0 #6366f1' : 'none',
      }}>
      {/* Active pill indicator */}
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, borderRadius: '0 3px 3px 0',
          background: 'linear-gradient(180deg,#6366f1,#7c3aed)',
        }} />
      )}
      <span className="w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0"
        style={{
          background: active ? 'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(124,58,237,0.15))' : 'transparent',
          boxShadow: active ? '0 1px 4px rgba(99,102,241,0.2)' : 'none',
          transition: 'all 0.15s',
        }}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {badge ? (
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
          style={{ background: C.crimson, color: '#fff', minWidth: 20, textAlign: 'center' }}>
          {badge}
        </span>
      ) : active ? (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.indigo }} />
      ) : null}
    </button>
  )
}

// ─── Skeleton / Error / Freshness primitives ─────────────────────────────────

function SkeletonBlock({ w = '100%', h = 16, radius = 8 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: 'linear-gradient(90deg,rgba(148,163,184,0.13) 0%,rgba(148,163,184,0.22) 50%,rgba(148,163,184,0.13) 100%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s infinite' }} />
  )
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3">
      <SkeletonBlock w="55%" h={12} />
      <SkeletonBlock w="40%" h={32} />
      <SkeletonBlock w="70%" h={10} />
      <SkeletonBlock h={48} radius={10} />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2"><SkeletonBlock w={180} h={12} /><SkeletonBlock w={120} h={9} /></div>
        <SkeletonBlock w={180} h={28} radius={10} />
      </div>
      <SkeletonBlock h={260} radius={12} />
      <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
        {[80,100,60,90].map((w,i) => <SkeletonBlock key={i} w={w} h={10} />)}
      </div>
    </div>
  )
}

function ErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 180 }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}` }}>⚠</div>
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: C.text }}>{title}</p>
        <p className="text-xs" style={{ color: C.textSub }}>{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
          style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
          ↻ Retry
        </button>
      )}
    </div>
  )
}

function DataFreshness({ source, updatedAt }: { source: string; updatedAt: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.emerald }} />
      <span className="text-[10px] font-mono" style={{ color: C.textSub }}>{source} · Updated {updatedAt}</span>
    </div>
  )
}

function LegendItem({ color, label, dashed, fill }: { color: string; label: string; dashed?: boolean; fill?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {fill
        ? <span className="w-6 h-3 rounded-sm opacity-30" style={{ background: color }} />
        : <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '5 3' : undefined} /></svg>
      }
      <span className="text-xs" style={{ color: C.textSub }}>{label}</span>
    </div>
  )
}

// ─── Screen 1: Dashboard ──────────────────────────────────────────────────────

function Dashboard({ setScreen, dateRange }: { setScreen: (s: Screen) => void; dateRange: string }) {
  const [chartFilter, setChartFilter] = useState<ChartFilter>('All')
  const [queued, setQueued] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [chartError, setChartError] = useState(false)
  const filters: ChartFilter[] = ['All', 'Trend Only', 'Seasonality', 'Anomalies']

  const filteredData = useMemo(() => salesData.map(d => {
    if (chartFilter === 'Trend Only')  return { ...d, actual: undefined, upper: undefined, lower: undefined }
    if (chartFilter === 'Seasonality') return { ...d, actual: undefined, predicted: undefined, trend: undefined }
    return d
  }), [chartFilter])

  return (
    <div className="flex flex-col gap-5">
      {/* Quick-action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold" style={{ color: C.text }}>Executive Dashboard</h1>
          <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>AI-powered demand forecasting · live data</p>
        </div>
        <button
          onClick={() => setScreen('inventory')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.32)' }}
        >
          <span style={{ fontSize: 15 }}>📦</span> Current Stock
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Forecast Accuracy" value="94.7%" sub="+1.2% vs last period" trend="up" accent={C.emerald} accentBg={C.emeraldBg} accentBdr={C.emeraldBdr} icon="◎" />
        <KpiCard label="Predicted 30-Day Demand" value="284,190" sub="units across all SKUs" trend="up" accent={C.indigo} accentBg={C.indigoBg} accentBdr={C.indigoBdr} icon="↑" />
        <KpiCard label="High-Risk Stockout SKUs" value="12" sub="Requires immediate action" trend="down" accent={C.crimson} accentBg={C.crimsonBg} accentBdr={C.crimsonBdr} icon="⚠" badge="ALERT" />
        <KpiCard label="Overstock Warning Cost" value="$842,500" sub="Across 8 SKUs this month" trend="down" accent={C.amber} accentBg={C.amberBg} accentBdr={C.amberBdr} icon="▲" badge="WARN" />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 296px' }}>
        <div className="glass glass-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: C.text }}>Demand Forecast vs. Historical Sales</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs font-mono" style={{ color: C.textSub }}>All categories · {dateRange}</p>
                <DataFreshness source="Snowflake" updatedAt="6 min ago" />
              </div>
            </div>
            <div className="flex rounded-xl p-0.5" style={{ background: 'rgba(148,163,184,0.12)', border: `1px solid ${C.border}` }}>
              {filters.map(f => (
                <button key={f} onClick={() => setChartFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={{ background: chartFilter === f ? 'rgba(255,255,255,0.9)' : 'transparent', color: chartFilter === f ? C.indigo : C.textSub }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 280 }}><SkeletonBlock h={280} radius={12} /></div>
          ) : chartError ? (
            <ErrorCard title="Forecast generation failed" message="The model timed out. Check your data pipeline connection and retry." onRetry={() => setChartError(false)} />
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={filteredData} margin={{ top: 8, right: 8, bottom: 4, left: -4 }}>
                <defs>
                  <linearGradient id="bandG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="actualG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 500 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x="Sep 4" stroke="rgba(99,102,241,0.4)" strokeDasharray="4 4" label={{ value: '↑ Forecast start', fill: C.indigo, fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600 }} />
                {(chartFilter === 'All' || chartFilter === 'Seasonality') && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandG)" name="Confidence Band" />}
                {chartFilter !== 'Seasonality' && chartFilter !== 'Trend Only' && <Area type="monotone" dataKey="actual" stroke="#059669" strokeWidth={2.5} fill="url(#actualG)" dot={false} name="Historical Sales" connectNulls={false} />}
                {(chartFilter === 'All' || chartFilter === 'Anomalies') && <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="Predicted Demand" />}
                {(chartFilter === 'Trend Only' || chartFilter === 'All') && <Line type="monotone" dataKey="trend" stroke="#7c3aed" strokeWidth={2} strokeDasharray="2 2" dot={false} name="Trend" />}
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-6 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
            <LegendItem color="#059669" label="Historical Sales" />
            <LegendItem color="#6366f1" label="Predicted Demand" dashed />
            <LegendItem color="#7c3aed" label="Trend" dashed />
            <LegendItem color="#6366f1" label="Confidence Band" fill />
            <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500) }}
              className="ml-auto text-xs px-2.5 py-1 rounded-lg cursor-pointer"
              style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
              ↻ Refresh
            </button>
          </div>
        </div>
        <div className="glass glass-hover rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: C.text }}>Top Restock Needed</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: C.crimsonBg, color: C.crimson, border: `1px solid ${C.crimsonBdr}` }}>5 urgent</span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {topRestockItems.map(item => (
              <div key={item.sku} className="glass-inset rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight truncate" style={{ color: C.text }}>{item.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>{item.sku}</p>
                  </div>
                  <Badge status={item.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <span className="text-xs" style={{ color: C.textSub }}>Stock: <span className="font-mono font-semibold" style={{ color: C.text }}>{item.stock}</span></span>
                    <span className="text-xs" style={{ color: C.textSub }}>30d: <span className="font-mono font-semibold" style={{ color: C.indigo }}>{item.demand}</span></span>
                  </div>
                  <button onClick={() => setQueued(p => { const n = new Set(p); n.has(item.sku) ? n.delete(item.sku) : n.add(item.sku); return n })}
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                    style={{ background: queued.has(item.sku) ? C.emeraldBg : C.indigoBg, color: queued.has(item.sku) ? C.emerald : C.indigo, border: `1px solid ${queued.has(item.sku) ? C.emeraldBdr : C.indigoBdr}` }}>
                    {queued.has(item.sku) ? '✓ Queued' : 'Reorder'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen('inventory')}
            className="mt-3 w-full py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
            View All Inventory →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Category: Electronics" value="142,800 units" sub="53% of total demand" color={C.indigo} />
        <MiniStat label="Model: Prophet + LSTM Ensemble" value="Confidence: 91.4%" sub="Last retrained 6 hours ago" color={C.violet} />
        <MiniStat label="Active Warehouses" value="7 of 9 Online" sub="DFW Node · Scheduled Maintenance" color={C.amber} />
      </div>

      {/* AI Insight strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '📉', color: C.crimson, bg: C.crimsonBg, bdr: C.crimsonBdr, title: 'Demand spike detected', body: 'WH-1000XM5 demand is 2.4× above baseline for {dateRange}. Consider emergency restock.'.replace('{dateRange}', dateRange) },
          { icon: '💡', color: C.indigo,  bg: C.indigoBg,  bdr: C.indigoBdr,  title: 'Forecast confidence high', body: 'Prophet + LSTM ensemble achieved 94.7% accuracy this period — highest in 6 months.' },
          { icon: '⚡', color: C.amber,   bg: C.amberBg,   bdr: C.amberBdr,   title: 'Lead time risk', body: 'DJI Mini 4 Pro has 28-day lead time but only 15 units remaining. Reorder window closes in 2 days.' },
        ].map(ins => (
          <div key={ins.title} className="glass glass-hover rounded-2xl p-4 flex gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: ins.bg, border: `1px solid ${ins.bdr}` }}>{ins.icon}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.text }}>{ins.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>{ins.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Snapshot Widget */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: C.text }}>Inventory Snapshot</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>Live metrics across critical SKUs · updated 6 min ago</p>
          </div>
          <button
            onClick={() => setScreen('inventory')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.30)' }}
          >
            <span>▦</span> View Inventory
          </button>
        </div>

        {/* Column headers */}
        <div className="grid px-5 py-2.5 text-xs font-mono font-semibold"
          style={{
            gridTemplateColumns: '200px 1fr 1fr 1fr 1fr 1fr 80px',
            color: C.textSub,
            background: 'rgba(248,250,255,0.6)',
            borderBottom: `1px solid ${C.border}`,
          }}>
          <span>Product</span>
          <span>Current Stock</span>
          <span>Forecast Demand</span>
          <span>Safety Stock</span>
          <span>Reorder Point</span>
          <span>Lead Time</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        {inventoryData.slice(0, 6).map((item, i) => {
          const dailyRate   = item.demand30 / 30
          const daysLeft    = dailyRate > 0 ? Math.floor(item.stock / dailyRate) : 999
          const stockPct    = Math.min(100, Math.round((item.stock / Math.max(item.safety * 2, item.demand30)) * 100))
          const statusColor = item.status === 'critical' ? C.crimson : item.status === 'warning' ? C.amber : item.status === 'overstock' ? C.violet : C.emerald
          const statusBg    = item.status === 'critical' ? C.crimsonBg : item.status === 'warning' ? C.amberBg : item.status === 'overstock' ? C.violetBg : C.emeraldBg
          const statusBdr   = item.status === 'critical' ? C.crimsonBdr : item.status === 'warning' ? C.amberBdr : item.status === 'overstock' ? C.violetBdr : C.emeraldBdr
          const statusLabel = item.status === 'critical' ? 'Critical' : item.status === 'warning' ? 'At Risk' : item.status === 'overstock' ? 'Overstock' : 'Optimal'

          return (
            <div
              key={item.sku}
              className="grid items-center px-5 py-3 transition-all"
              style={{
                gridTemplateColumns: '200px 1fr 1fr 1fr 1fr 1fr 80px',
                borderBottom: i < 5 ? `1px solid ${C.border}` : undefined,
                background: i % 2 === 1 ? 'rgba(248,250,255,0.35)' : 'transparent',
              }}
            >
              {/* Product */}
              <div className="min-w-0 pr-3">
                <p className="text-xs font-medium truncate" style={{ color: C.text }}>{item.name}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>{item.sku}</p>
              </div>

              {/* Current Stock */}
              <div>
                <p className="text-sm font-bold font-mono" style={{ color: item.status === 'critical' ? C.crimson : item.status === 'overstock' ? C.violet : C.text }}>
                  {item.stock.toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-1.5 rounded-full flex-1 max-w-[56px]" style={{ background: 'rgba(148,163,184,0.18)' }}>
                    <div className="h-full rounded-full" style={{ width: `${stockPct}%`, background: statusColor, opacity: 0.7 }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: C.textSub }}>{daysLeft < 999 ? `${daysLeft}d` : '∞'}</span>
                </div>
              </div>

              {/* Forecast Demand */}
              <div>
                <p className="text-sm font-bold font-mono" style={{ color: C.indigo }}>{item.demand30.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: C.textSub }}>30-day units</p>
              </div>

              {/* Safety Stock */}
              <div>
                <p className="text-sm font-bold font-mono" style={{ color: item.stock < item.safety ? C.amber : C.emerald }}>{item.safety}</p>
                <p className="text-xs mt-0.5" style={{ color: C.textSub }}>min buffer</p>
              </div>

              {/* Reorder Point */}
              <div>
                {item.reorder > 0 ? (
                  <>
                    <p className="text-sm font-bold font-mono" style={{ color: C.crimson }}>{item.reorder}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.textSub }}>units · trigger</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold font-mono" style={{ color: C.textSub }}>—</p>
                    <p className="text-xs mt-0.5" style={{ color: C.textSub }}>not needed</p>
                  </>
                )}
              </div>

              {/* Lead Time */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: C.indigoBg, border: `1px solid ${C.indigoBdr}` }}>
                  <span className="text-xs font-bold font-mono" style={{ color: C.indigo }}>{item.lead}</span>
                </div>
                <span className="text-xs" style={{ color: C.textSub }}>days</span>
              </div>

              {/* Status badge */}
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
                  style={{ background: statusBg, border: `1px solid ${statusBdr}`, color: statusColor }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                  {statusLabel}
                </span>
              </div>
            </div>
          )
        })}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background: 'rgba(248,250,255,0.5)', borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-5">
            {[
              { label: 'Critical',  color: C.crimson, count: inventoryData.filter(i => i.status === 'critical').length },
              { label: 'At Risk',   color: C.amber,   count: inventoryData.filter(i => i.status === 'warning').length },
              { label: 'Optimal',   color: C.emerald, count: inventoryData.filter(i => i.status === 'optimal').length },
              { label: 'Overstock', color: C.violet,  count: inventoryData.filter(i => i.status === 'overstock').length },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-mono" style={{ color: C.textSub }}>
                  <span className="font-bold" style={{ color: s.color }}>{s.count}</span> {s.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs font-mono" style={{ color: C.textSub }}>
            Showing 6 of {inventoryData.length} SKUs ·{' '}
            <button onClick={() => setScreen('inventory')} className="cursor-pointer underline" style={{ color: C.indigo }}>
              view all
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

const kpiSparkData = [42, 55, 38, 61, 70, 58]

function KpiCard({ label, value, sub, trend, accent, accentBg, accentBdr, icon, badge }: any) {
  const maxSpark = Math.max(...kpiSparkData)
  const sparkH = 28
  const barW = 6
  const barGap = 3
  return (
    <div className="glass rounded-2xl overflow-hidden" style={{ borderColor: accentBdr }}>
      {/* Left accent bar */}
      <div className="flex h-full">
        <div style={{ width: 4, background: accent, borderRadius: '4px 0 0 4px', minHeight: '100%', flexShrink: 0 }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium leading-tight" style={{ color: C.textMid }}>{label}</p>
            <div className="flex items-center gap-1.5">
              {badge && <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ background: accentBg, color: accent, border: `1px solid ${accentBdr}` }}>{badge}</span>}
              <span style={{ color: accent, fontSize: 14 }}>{icon}</span>
            </div>
          </div>
          <p className="text-3xl font-bold font-mono" style={{ color: accent }}>{value}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: trend === 'up' ? C.emeraldBg : C.crimsonBg, color: trend === 'up' ? C.emerald : C.crimson, border: `1px solid ${trend === 'up' ? C.emeraldBdr : C.crimsonBdr}` }}>
                {trend === 'up' ? '▲' : '▼'}
              </span>
              <p className="text-xs" style={{ color: C.textSub }}>{sub}</p>
            </div>
            {/* Mini sparkline */}
            <svg width={(barW + barGap) * kpiSparkData.length - barGap} height={sparkH}>
              {kpiSparkData.map((v, i) => {
                const h = Math.max(3, Math.round((v / maxSpark) * sparkH))
                return (
                  <rect key={i} x={i * (barW + barGap)} y={sparkH - h} width={barW} height={h}
                    rx={2} fill={accent} opacity={i === kpiSparkData.length - 1 ? 0.9 : 0.35} />
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass glass-hover rounded-2xl p-4 relative">
      <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full" style={{ background: color, opacity: 0.7 }} />
      <p className="text-xs mb-1" style={{ color: C.textSub }}>{label}</p>
      <p className="text-base font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: C.textSub }}>{sub}</p>
    </div>
  )
}

// ─── Screen 2: Analytics ──────────────────────────────────────────────────────

function Analytics({ dateRange }: { dateRange: string }) {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('90d')
  const [category, setCategory] = useState('Electronics')
  const [warehouse, setWarehouse] = useState('All Warehouses')
  const [confidence, setConfidence] = useState(80)

  return (
    <div className="flex flex-col gap-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-lg font-semibold" style={{ color: C.text }}>Wireless Noise-Canceling Headphones</h1>
              <Badge status="critical" />
            </div>
            <div className="flex items-center gap-3 text-xs font-mono flex-wrap" style={{ color: C.textSub }}>
              <span>SKU: <span style={{ color: C.textMid }}>WH-1000XM5</span></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Category: <span style={{ color: C.textMid }}>Consumer Electronics → Audio</span></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Current Stock: <span className="font-semibold" style={{ color: C.crimson }}>23 units</span></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Reorder Point: <span className="font-semibold" style={{ color: C.amber }}>68 units</span></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <DataFreshness source="SAP S/4HANA" updatedAt="2 min ago" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs" style={{ color: C.textSub }}>30-Day Forecast</p>
              <p className="text-xl font-bold font-mono" style={{ color: C.indigo }}>180 units</p>
            </div>
            <div className="w-px h-10" style={{ background: C.border }} />
            <div className="text-right">
              <p className="text-xs" style={{ color: C.textSub }}>Forecast Confidence</p>
              <p className="text-xl font-bold font-mono" style={{ color: C.emerald }}>88.4%</p>
            </div>
          </div>
        </div>
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium" style={{ color: C.textSub }}>Filters:</span>
          {[{ value: category, onChange: setCategory, options: ['Electronics','Appliances','Gaming'] },
            { value: warehouse, onChange: setWarehouse, options: ['All Warehouses','Dallas-Fort Worth','Los Angeles','Chicago'] }].map((sel, i) => (
            <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.textMid }}>
              {sel.options.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <div className="flex rounded-xl p-0.5" style={{ background: 'rgba(148,163,184,0.12)', border: `1px solid ${C.border}` }}>
            {(['7d','30d','90d'] as TimeHorizon[]).map(h => (
              <button key={h} onClick={() => setTimeHorizon(h)}
                className="px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer"
                style={{ background: timeHorizon === h ? 'rgba(255,255,255,0.9)' : 'transparent', color: timeHorizon === h ? C.indigo : C.textSub }}>
                {h}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs" style={{ color: C.textSub }}>Confidence ≥</span>
            <input type="range" min={60} max={99} value={confidence} onChange={e => setConfidence(+e.target.value)} className="w-28 cursor-pointer accent-indigo-500" />
            <span className="text-xs font-mono font-bold w-8" style={{ color: C.indigo }}>{confidence}%</span>
          </div>
        </div>
      </div>
      {[
        { title: 'Raw Sales + Anomaly Detection', subtitle: 'Flagged events require manual review', badge: '2 Anomalies Detected', badgeColor: 'crimson' as const,
          chart: (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={anomalyDetailData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.textSub, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.textSub, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sales" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Sales" />
                <Line type="monotone" dataKey="anomaly" stroke={C.crimson} strokeWidth={0} dot={{ fill: C.crimson, r: 5, strokeWidth: 2, stroke: 'rgba(239,68,68,0.3)' }} name="Anomaly" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          ),
          footer: (
            <div className="mt-3 flex gap-3 flex-wrap">
              {['Jul 3: One-off Flash Sale (+21.4% spike)', 'Aug 7: Prime Day Promo (+14.9% spike)'].map(msg => (
                <div key={msg} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: C.crimsonBg, border: `1px solid ${C.crimsonBdr}` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: C.crimson }} />
                  <span className="text-xs font-mono" style={{ color: C.crimson }}>{msg}</span>
                </div>
              ))}
            </div>
          )
        },
        { title: 'Long-Term Trend', subtitle: 'LOESS smoothed directional growth curve', badge: '+7.3% Quarterly Growth', badgeColor: 'emerald' as const,
          chart: (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="trendG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.textSub, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.textSub, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} tickFormatter={v => `${(v/1000).toFixed(2)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="trend" stroke={C.violet} strokeWidth={2} fill="url(#trendG)" name="Trend" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )
        },
        { title: 'Seasonal Decomposition', subtitle: 'Cyclical weekly/monthly patterns — holiday spikes visible in W8 and W12', badge: 'Peak: Holiday Season', badgeColor: 'amber' as const,
          chart: (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={seasonalData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: C.textSub, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.textSub, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={[0.7, 1.6]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={1} stroke="rgba(148,163,184,0.5)" strokeDasharray="4 2" />
                <Bar dataKey="factor" fill={C.amber} opacity={0.75} radius={[4, 4, 0, 0]} name="Seasonal Factor" />
              </BarChart>
            </ResponsiveContainer>
          )
        },
      ].map(dc => (
        <DecompChart key={dc.title} title={dc.title} subtitle={dc.subtitle} badge={dc.badge} badgeColor={dc.badgeColor}>
          {dc.chart}
          {(dc as any).footer}
        </DecompChart>
      ))}
    </div>
  )
}

function DecompChart({ title, subtitle, badge, badgeColor, children }: { title: string; subtitle: string; badge: string; badgeColor: 'crimson'|'emerald'|'amber'; children: React.ReactNode }) {
  const bMap = { crimson: { bg: C.crimsonBg, border: C.crimsonBdr, color: C.crimson }, emerald: { bg: C.emeraldBg, border: C.emeraldBdr, color: C.emerald }, amber: { bg: C.amberBg, border: C.amberBdr, color: C.amber } }
  const b = bMap[badgeColor]
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: C.text }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: C.textSub }}>{subtitle}</p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-xl" style={{ background: b.bg, border: `1px solid ${b.border}`, color: b.color }}>{badge}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Inventory helpers ────────────────────────────────────────────────────────

type InventoryRow = typeof inventoryData[number] & { stockOverride?: number }

function deriveStatus(stock: number, demand30: number, lead: number, safety: number): string {
  const dailyRate = demand30 / 30
  const daysOfSupply = dailyRate > 0 ? stock / dailyRate : 999
  if (daysOfSupply < lead) return 'critical'
  if (stock < safety) return 'warning'
  if (stock > safety * 2.5) return 'overstock'
  return 'optimal'
}

function deriveReorder(stock: number, demand30: number, lead: number, safety: number): number {
  const dailyRate = demand30 / 30
  const reorderPoint = Math.ceil(dailyRate * lead + safety)
  return stock < reorderPoint ? reorderPoint : 0
}

function buildDepletionCurve(stock: number, demand30: number, lead: number, safety: number) {
  const dailyRate = demand30 / 30
  const points: { day: string; stock: number; safety: number; reorder: number }[] = []
  const reorderPoint = Math.ceil(dailyRate * lead + safety)
  for (let d = 0; d <= 45; d += 3) {
    points.push({
      day: `Day ${d}`,
      stock: Math.max(0, Math.round(stock - dailyRate * d)),
      safety,
      reorder: reorderPoint,
    })
  }
  return points
}

// ─── Screen 3: Inventory ──────────────────────────────────────────────────────

function Inventory({ stocks, setStocks, dateRange }: { stocks: Record<string, number>; setStocks: React.Dispatch<React.SetStateAction<Record<string, number>>>; dateRange: string }) {
  const [editingSku, setEditingSku] = useState<string | null>(null)
  const [editVal, setEditVal]       = useState('')
  const [previewSku, setPreviewSku] = useState<string | null>(null)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [approved, setApproved]     = useState<Set<string>>(new Set())
  const [filter, setFilter]         = useState('All')
  const [runningForecast, setRunningForecast] = useState(false)
  const [forecastRan, setForecastRan]         = useState(false)
  const [modifiedSkus, setModifiedSkus]       = useState<Set<string>>(new Set())

  // Derive live rows from user-overridden stock values
  const liveRows = useMemo(() => inventoryData.map(item => {
    const stock  = stocks[item.sku] ?? item.stock
    const status  = deriveStatus(stock, item.demand30, item.lead, item.safety)
    const reorder = deriveReorder(stock, item.demand30, item.lead, item.safety)
    const cost    = reorder > 0 ? reorder * (item.cost / (item.reorder || reorder)) : 0
    return { ...item, stock, status, reorder, cost }
  }), [stocks])

  const filters = ['All', 'Critical', 'At Risk', 'Optimal', 'Overstocked']
  const filtered = liveRows.filter(item => {
    if (filter === 'Critical')    return item.status === 'critical'
    if (filter === 'At Risk')     return item.status === 'warning'
    if (filter === 'Optimal')     return item.status === 'optimal'
    if (filter === 'Overstocked') return item.status === 'overstock'
    return true
  })

  const totalCost = liveRows.filter(i => selected.has(i.sku)).reduce((a, i) => a + i.cost, 0)
  const toggle = (sku: string) => setSelected(p => { const n = new Set(p); n.has(sku) ? n.delete(sku) : n.add(sku); return n })

  const startEdit = (sku: string, current: number) => {
    setEditingSku(sku); setEditVal(String(current))
  }

  const commitEdit = (sku: string) => {
    const val = parseInt(editVal, 10)
    if (!isNaN(val) && val >= 0) {
      setStocks(p => ({ ...p, [sku]: val }))
      setModifiedSkus(p => new Set([...p, sku]))
      setForecastRan(false)
      api.updateInventoryItem(sku, { stock: val }).catch(console.error)
    }
    setEditingSku(null)
  }

  const runForecast = () => {
    setRunningForecast(true)
    setTimeout(() => { setRunningForecast(false); setForecastRan(true) }, 1400)
  }

  const previewRow = previewSku ? liveRows.find(r => r.sku === previewSku) : null
  const depletionData = previewRow
    ? buildDepletionCurve(previewRow.stock, previewRow.demand30, previewRow.lead, previewRow.safety)
    : []

  return (
    <div className="flex flex-col gap-4">

      {/* Modified-stock alert banner */}
      {modifiedSkus.size > 0 && (
        <div className="rounded-2xl p-3.5 flex items-center justify-between"
          style={{ background: 'rgba(99,102,241,0.08)', border: `1px solid ${C.indigoBdr}` }}>
          <div className="flex items-center gap-3">
            <span style={{ color: C.indigo, fontSize: 18 }}>◈</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.indigo }}>
                {modifiedSkus.size} SKU{modifiedSkus.size > 1 ? 's' : ''} with updated stock levels
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.textSub }}>
                Run the demand forecast to recalculate predicted stockout dates, reorder points, and 30-day demand with your new figures.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setStocks(Object.fromEntries(inventoryData.map(i => [i.sku, i.stock]))); setModifiedSkus(new Set()); setForecastRan(false); setPreviewSku(null) }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
              style={{ background: 'rgba(148,163,184,0.12)', color: C.textMid, border: `1px solid ${C.border}` }}>
              Reset All
            </button>
            <button onClick={runForecast} disabled={runningForecast}
              className="px-5 py-2 rounded-xl text-sm font-bold cursor-pointer text-white transition-all flex items-center gap-2"
              style={{ background: forecastRan ? C.emerald : 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)', opacity: runningForecast ? 0.7 : 1 }}>
              {runningForecast ? (
                <><span className="animate-spin inline-block">↻</span> Running Forecast…</>
              ) : forecastRan ? '✓ Forecast Updated' : '▶ Run Demand Forecast'}
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium mr-1" style={{ color: C.textSub }}>Status:</span>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                style={{ background: filter === f ? C.indigoBg : 'transparent', color: filter === f ? C.indigo : C.textSub, border: `1px solid ${filter === f ? C.indigoBdr : 'transparent'}` }}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <DataFreshness source="SAP S/4HANA" updatedAt="4 min ago" />
            <span className="text-xs font-mono" style={{ color: C.textSub }}>{filtered.length} SKUs shown</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}`, display: modifiedSkus.size > 0 ? undefined : 'none' }}>
              {modifiedSkus.size} modified
            </span>
            <button className="text-xs px-3 py-1.5 rounded-xl cursor-pointer font-medium"
              style={{ background: 'rgba(148,163,184,0.10)', color: C.textMid, border: `1px solid ${C.border}` }}>
              ↓ Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table + Preview panel */}
      <div className="grid gap-4" style={{ gridTemplateColumns: previewSku ? '1fr 320px' : '1fr' }}>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: previewSku ? 420 : 480 }}>
            <table className="w-full">
              <thead style={{ background: 'rgba(248,250,255,0.9)', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th className="py-3 px-4 text-left">
                    <input type="checkbox" className="cursor-pointer accent-indigo-500"
                      onChange={e => setSelected(e.target.checked ? new Set(filtered.map(i => i.sku)) : new Set())} />
                  </th>
                  {['SKU ID','Product Name','Current Stock ✎','30-Day Demand','Lead Time','Safety Stock','Reorder Pt.','Status','Action'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold font-mono whitespace-nowrap" style={{ color: C.textSub }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runningForecast && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3" style={{ paddingTop: 14, paddingBottom: 14 }}>
                        <SkeletonBlock w={j === 1 ? 140 : j === 0 ? 20 : 60} h={10} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!runningForecast && filtered.map((item, i) => {
                  const isEditing   = editingSku === item.sku
                  const isModified  = modifiedSkus.has(item.sku)
                  const isPreviewing = previewSku === item.sku
                  const originalStock = inventoryData.find(r => r.sku === item.sku)!.stock
                  const stockChanged = item.stock !== originalStock
                  return (
                    <tr key={item.sku}
                      onClick={() => !isEditing && setPreviewSku(isPreviewing ? null : item.sku)}
                      style={{
                        background: isPreviewing ? 'rgba(99,102,241,0.07)' : selected.has(item.sku) ? 'rgba(99,102,241,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(248,250,255,0.4)',
                        borderBottom: `1px solid ${C.border}`,
                        borderLeft: isPreviewing ? `3px solid ${C.indigo}` : '3px solid transparent',
                        cursor: isEditing ? 'default' : 'pointer',
                        transition: 'background 0.15s',
                      }}>
                      <td className="py-2.5 px-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(item.sku)} onChange={() => toggle(item.sku)} className="cursor-pointer accent-indigo-500" />
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono" style={{ color: C.textSub }}>
                        <div className="flex items-center gap-1.5">
                          {item.sku}
                          {isModified && <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.indigo }} title="Stock modified" />}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs max-w-[180px]" style={{ color: C.text }}>
                        <span className="truncate block">{item.name}</span>
                      </td>

                      {/* Editable stock cell */}
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              type="number" min={0} value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(item.sku); if (e.key === 'Escape') setEditingSku(null) }}
                              onBlur={() => commitEdit(item.sku)}
                              className="w-20 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center focus:outline-none"
                              style={{ background: C.indigoBg, border: `1.5px solid ${C.indigo}`, color: C.indigo }}
                            />
                            <button onMouseDown={() => commitEdit(item.sku)}
                              className="text-xs px-1.5 py-1 rounded-md cursor-pointer"
                              style={{ background: C.emeraldBg, color: C.emerald }}>✓</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className={`text-xs font-mono font-bold transition-all`}
                              style={{ color: item.status === 'critical' ? C.crimson : item.status === 'overstock' ? C.violet : C.text }}>
                              {item.stock}
                              {stockChanged && (
                                <span className="ml-1 text-xs font-mono" style={{ color: C.indigo }}>
                                  ({originalStock > item.stock ? '−' : '+'}{Math.abs(item.stock - originalStock)})
                                </span>
                              )}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); startEdit(item.sku, item.stock) }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded-md cursor-pointer"
                              style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}
                              title="Edit stock">
                              ✎
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-xs font-mono font-semibold" style={{ color: C.indigo }}>{item.demand30}</td>
                      <td className="py-2.5 px-3 text-xs font-mono" style={{ color: C.textMid }}>{item.lead}d</td>
                      <td className="py-2.5 px-3 text-xs font-mono" style={{ color: C.textMid }}>{item.safety}</td>
                      <td className="py-2.5 px-3 text-xs font-mono font-bold"
                        style={{ color: item.status === 'critical' ? C.crimson : item.status === 'warning' ? C.amber : C.textSub }}>
                        {item.reorder > 0 ? item.reorder : '—'}
                      </td>
                      <td className="py-2.5 px-3"><Badge status={item.status} /></td>
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        {item.reorder > 0 ? (
                          <div className="flex gap-1.5">
                            <button onClick={() => setApproved(p => new Set([...p, item.sku]))}
                              className="text-xs px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap"
                              style={{ background: approved.has(item.sku) ? C.emeraldBg : C.indigoBg, color: approved.has(item.sku) ? C.emerald : C.indigo, border: `1px solid ${approved.has(item.sku) ? C.emeraldBdr : C.indigoBdr}` }}>
                              {approved.has(item.sku) ? '✓ Approved' : 'Approve'}
                            </button>
                          </div>
                        ) : <span className="text-xs font-mono" style={{ color: C.textSub }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Depletion forecast preview panel */}
        {previewSku && previewRow && (
          <div className="glass rounded-2xl p-4 flex flex-col gap-3" style={{ borderLeft: `2px solid ${C.indigoBdr}` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: C.indigo }}>Stock Depletion Forecast</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: C.textSub }}>{previewRow.sku}</p>
              </div>
              <button onClick={() => setPreviewSku(null)} className="text-xs cursor-pointer px-1.5 rounded" style={{ color: C.textSub }}>✕</button>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const dailyRate = previewRow.demand30 / 30
                const daysLeft  = dailyRate > 0 ? Math.floor(previewRow.stock / dailyRate) : 999
                const stockoutDate = new Date('2026-09-17')
                stockoutDate.setDate(stockoutDate.getDate() + daysLeft)
                const stockoutStr = daysLeft < 999 ? stockoutDate.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'No risk'
                const status = previewRow.status
                return [
                  { label: 'Current Stock', val: `${previewRow.stock} units`, color: status === 'critical' ? C.crimson : status === 'overstock' ? C.violet : C.text },
                  { label: 'Daily Burn Rate', val: `${dailyRate.toFixed(1)} u/day`, color: C.textMid },
                  { label: 'Days of Supply', val: daysLeft < 999 ? `${daysLeft}d` : '∞', color: daysLeft < previewRow.lead ? C.crimson : daysLeft < previewRow.lead + 7 ? C.amber : C.emerald },
                  { label: 'Projected Stockout', val: stockoutStr, color: daysLeft < 30 ? C.crimson : C.textMid },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-2.5" style={{ background: 'rgba(248,250,255,0.6)', border: `1px solid ${C.border}` }}>
                    <p className="text-xs" style={{ color: C.textSub }}>{m.label}</p>
                    <p className="text-sm font-bold font-mono mt-0.5" style={{ color: m.color }}>{m.val}</p>
                  </div>
                ))
              })()}
            </div>

            {/* Depletion chart */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: C.textMid }}>45-Day Stock Projection</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={depletionData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="deplG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={previewRow.status === 'critical' ? C.crimson : C.indigo} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={previewRow.status === 'critical' ? C.crimson : C.indigo} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: C.textSub, fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: C.textSub, fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={previewRow.safety} stroke={C.amber} strokeDasharray="4 3"
                    label={{ value: 'Safety', fill: C.amber, fontSize: 9 }} />
                  <ReferenceLine y={previewRow.reorder > 0 ? previewRow.reorder : deriveReorder(previewRow.stock, previewRow.demand30, previewRow.lead, previewRow.safety)}
                    stroke={C.crimson} strokeDasharray="4 3"
                    label={{ value: 'Reorder', fill: C.crimson, fontSize: 9 }} />
                  <Area type="monotone" dataKey="stock" stroke={previewRow.status === 'critical' ? C.crimson : C.indigo}
                    strokeWidth={2} fill="url(#deplG)" name="Projected Stock" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Inline edit shortcut */}
            <div className="rounded-xl p-3" style={{ background: C.indigoBg, border: `1px solid ${C.indigoBdr}` }}>
              <p className="text-xs font-semibold mb-2" style={{ color: C.indigo }}>Update Stock Manually</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0}
                  defaultValue={previewRow.stock}
                  key={previewRow.stock}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = parseInt((e.target as HTMLInputElement).value, 10)
                      if (!isNaN(val) && val >= 0) {
                        setStocks(p => ({ ...p, [previewRow.sku]: val }))
                        setModifiedSkus(p => new Set([...p, previewRow.sku]))
                        setForecastRan(false)
                      }
                    }
                  }}
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm font-mono font-bold focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.8)', border: `1.5px solid ${C.indigoBdr}`, color: C.indigo }}
                  placeholder="Enter new stock..."
                />
                <button
                  onClick={() => {
                    const inp = document.querySelector<HTMLInputElement>(`#stock-input-${previewRow.sku}`)
                    const val = parseInt((document.querySelector('.stock-panel-input') as HTMLInputElement)?.value ?? '', 10)
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-white"
                  style={{ background: C.indigo }}>
                  Apply
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: C.textSub }}>Press Enter to apply · chart updates live</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="glass-strong rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {[
            { label: 'Selected SKUs',     value: `${selected.size}`,             color: C.text },
            null,
            { label: 'Total Reorder Cost', value: `$${totalCost.toLocaleString()}`, color: C.emerald },
            null,
            { label: 'Approved Orders',   value: `${approved.size}`,             color: C.indigo },
          ].map((s, i) =>
            s === null ? <div key={i} className="w-px h-10" style={{ background: C.border }} /> :
            <div key={i}><p className="text-xs" style={{ color: C.textSub }}>{s.label}</p><p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p></div>
          )}
          <div className="w-px h-10" style={{ background: C.border }} />
          <div className="flex gap-4">
            {[
              { label: 'Critical', color: C.crimson, count: liveRows.filter(i => i.status === 'critical').length },
              { label: 'At Risk',  color: C.amber,   count: liveRows.filter(i => i.status === 'warning').length },
              { label: 'Optimal',  color: C.emerald, count: liveRows.filter(i => i.status === 'optimal').length },
            ].map(s => (
              <span key={s.label} className="text-xs font-mono">
                <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
                <span className="ml-1" style={{ color: C.textSub }}>{s.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'rgba(148,163,184,0.10)', color: C.textMid, border: `1px solid ${C.border}` }}>
            ↓ Export Selected
          </button>
          <button className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
            Export Purchase Orders to ERP →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 4: Anomaly Alerts ─────────────────────────────────────────────────

const severityMeta: Record<string, { bg: string; border: string; color: string; label: string; icon: string }> = {
  critical: { bg: C.crimsonBg, border: C.crimsonBdr, color: C.crimson, label: 'Critical', icon: '⚠' },
  warning:  { bg: C.amberBg,   border: C.amberBdr,   color: C.amber,   label: 'Warning',  icon: '▲' },
  info:     { bg: C.skyBg,     border: C.skyBdr,     color: C.sky,     label: 'Info',     icon: 'ℹ' },
}

const statusMeta: Record<string, { bg: string; border: string; color: string; label: string }> = {
  open:         { bg: C.crimsonBg, border: C.crimsonBdr, color: C.crimson, label: 'Open' },
  acknowledged: { bg: C.amberBg,   border: C.amberBdr,   color: C.amber,   label: 'Acknowledged' },
  resolved:     { bg: C.emeraldBg, border: C.emeraldBdr, color: C.emerald, label: 'Resolved' },
}

function AnomalyAlerts() {
  const [severityFilter, setSeverityFilter] = useState('All')
  const [statusFilter, setStatusFilter]     = useState('All')
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [statuses, setStatuses]             = useState<Record<string, string>>(() =>
    Object.fromEntries(anomalyEvents.map(e => [e.id, e.status]))
  )

  const filtered = anomalyEvents.filter(e =>
    (severityFilter === 'All' || e.severity === severityFilter.toLowerCase()) &&
    (statusFilter   === 'All' || statuses[e.id] === statusFilter.toLowerCase())
  )

  const acknowledge = (id: string) => {
    setStatuses(p => ({ ...p, [id]: p[id] === 'open' ? 'acknowledged' : p[id] }))
    api.updateAnomaly(id, 'acknowledged').catch(console.error)
  }
  const resolve = (id: string) => {
    setStatuses(p => ({ ...p, [id]: 'resolved' }))
    api.updateAnomaly(id, 'resolved').catch(console.error)
  }

  const counts = { critical: anomalyEvents.filter(e => e.severity === 'critical').length, warning: anomalyEvents.filter(e => e.severity === 'warning').length, open: Object.values(statuses).filter(s => s === 'open').length }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open Alerts', value: `${counts.open}`, color: C.crimson, bg: C.crimsonBg, border: C.crimsonBdr, icon: '⚠', sub: 'Require immediate action' },
          { label: 'Critical Severity', value: `${counts.critical}`, color: C.crimson, bg: C.crimsonBg, border: C.crimsonBdr, icon: '🔴', sub: 'High-impact anomalies' },
          { label: 'Warnings', value: `${counts.warning}`, color: C.amber, bg: C.amberBg, border: C.amberBdr, icon: '▲', sub: 'Monitor closely' },
          { label: 'Resolved This Week', value: '3', color: C.emerald, bg: C.emeraldBg, border: C.emeraldBdr, icon: '✓', sub: 'Auto-resolved by model' },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-4" style={{ borderColor: k.border }}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: C.textMid }}>{k.label}</p>
              <span style={{ color: k.color, fontSize: 14 }}>{k.icon}</span>
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-2" style={{ color: C.textSub }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Spark panel + Filter row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 260px' }}>
        {/* Alert feed */}
        <div className="glass rounded-2xl p-5">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium" style={{ color: C.textSub }}>Severity:</span>
            {['All','Critical','Warning','Info'].map(f => (
              <button key={f} onClick={() => setSeverityFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                style={{ background: severityFilter === f ? C.indigoBg : 'transparent', color: severityFilter === f ? C.indigo : C.textSub, border: `1px solid ${severityFilter === f ? C.indigoBdr : 'transparent'}` }}>
                {f}
              </button>
            ))}
            <div className="w-px h-5 mx-1" style={{ background: C.border }} />
            <span className="text-xs font-medium" style={{ color: C.textSub }}>Status:</span>
            {['All','Open','Acknowledged','Resolved'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                style={{ background: statusFilter === f ? C.indigoBg : 'transparent', color: statusFilter === f ? C.indigo : C.textSub, border: `1px solid ${statusFilter === f ? C.indigoBdr : 'transparent'}` }}>
                {f}
              </button>
            ))}
            <span className="ml-auto text-xs font-mono" style={{ color: C.textSub }}>{filtered.length} alerts</span>
          </div>

          {/* Alert list */}
          <div className="flex flex-col gap-3">
            {filtered.map(evt => {
              const sev = severityMeta[evt.severity]
              const st  = statusMeta[statuses[evt.id]]
              const isExpanded = expandedId === evt.id
              return (
                <div key={evt.id} className="rounded-xl overflow-hidden transition-all"
                  style={{ background: 'rgba(255,255,255,0.55)', border: `1px solid ${sev.border}`, boxShadow: `0 2px 12px ${sev.bg}` }}>
                  <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : evt.id)}>
                    {/* Severity icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                      <span style={{ color: sev.color, fontSize: 16 }}>{sev.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold" style={{ color: C.textSub }}>{evt.id}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded-md" style={{ background: sev.bg, color: sev.color }}>{evt.category}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded-md" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                        <span className="ml-auto text-xs font-mono" style={{ color: C.textSub }}>{evt.detected}</span>
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{evt.product}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono" style={{ color: C.textSub }}>SKU: <span style={{ color: C.textMid }}>{evt.sku}</span></span>
                        <span className="text-xs font-mono font-bold" style={{ color: sev.color }}>Δ {evt.deviation}</span>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: C.textSub, marginTop: 2 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: C.textMid }}>Description</p>
                          <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>{evt.description}</p>
                          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                            <span className="text-xs font-mono font-bold" style={{ color: sev.color }}>Impact:</span>
                            <span className="text-xs font-mono" style={{ color: C.textMid }}>{evt.impact}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: C.textMid }}>Sales Signal</p>
                          <ResponsiveContainer width="100%" height={70}>
                            <LineChart data={anomalySparkData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
                              <Line type="monotone" dataKey="v" stroke={sev.color} strokeWidth={1.5} dot={false} />
                              <YAxis hide />
                              <XAxis dataKey="t" hide />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {statuses[evt.id] === 'open' && (
                          <button onClick={() => acknowledge(evt.id)}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                            style={{ background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBdr}` }}>
                            Acknowledge
                          </button>
                        )}
                        {statuses[evt.id] !== 'resolved' && (
                          <button onClick={() => resolve(evt.id)}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                            style={{ background: C.emeraldBg, color: C.emerald, border: `1px solid ${C.emeraldBdr}` }}>
                            Mark Resolved
                          </button>
                        )}
                        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                          style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
                          View in Analytics →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side: alert categories + timeline */}
        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.text }}>By Category</h3>
            {[
              { label: 'Stockout Risk',    count: 2, color: C.crimson, bg: C.crimsonBg, pct: 29 },
              { label: 'Demand Spike',     count: 1, color: C.amber,   bg: C.amberBg,   pct: 14 },
              { label: 'Overstock',        count: 1, color: C.violet,  bg: C.violetBg,  pct: 14 },
              { label: 'Lead Time Change', count: 1, color: C.amber,   bg: C.amberBg,   pct: 14 },
              { label: 'Demand Drop',      count: 1, color: C.sky,     bg: C.skyBg,     pct: 14 },
              { label: 'Model Drift',      count: 1, color: C.emerald, bg: C.emeraldBg, pct: 14 },
            ].map(cat => (
              <div key={cat.label} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: C.textMid }}>{cat.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: cat.color }}>{cat.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(148,163,184,0.15)' }}>
                  <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-4 flex-1">
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.text }}>Recent Activity</h3>
            <div className="flex flex-col gap-0">
              {[
                { time: '14:32', text: 'WH-1000XM5 demand spike detected', color: C.crimson },
                { time: '09:10', text: 'IPH-15PRO stockout alert raised', color: C.crimson },
                { time: 'Yesterday', text: 'LG-OLED55 overstock acknowledged', color: C.amber },
                { time: 'Yesterday', text: 'DJI-MINI4 lead time updated', color: C.amber },
                { time: 'Sep 11', text: 'BOSE-QC45 demand drop flagged', color: C.sky },
                { time: 'Sep 10', text: 'MBP-14-M3 model drift resolved', color: C.emerald },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 py-2.5" style={{ borderBottom: i < 5 ? `1px solid ${C.border}` : undefined }}>
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                    {i < 5 && <div className="w-px flex-1 mt-1" style={{ background: C.border, minHeight: 20 }} />}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: C.text }}>{item.text}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 5: Reports ────────────────────────────────────────────────────────

function Reports() {
  const [activeTab, setActiveTab] = useState<'overview'|'library'>('overview')
  const [generating, setGenerating] = useState<string | null>(null)

  const generate = (id: string) => { setGenerating(id); setTimeout(() => setGenerating(null), 2000) }

  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <div className="glass rounded-2xl p-1 flex gap-1 w-fit">
        {(['overview', 'library'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all capitalize"
            style={{ background: activeTab === t ? 'rgba(255,255,255,0.9)' : 'transparent', color: activeTab === t ? C.indigo : C.textSub, boxShadow: activeTab === t ? '0 1px 6px rgba(99,102,241,0.12)' : undefined }}>
            {t === 'overview' ? 'Analytics Overview' : 'Report Library'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* KPI Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Revenue Forecasted (Sep)', value: '$248,000', color: C.indigo, sub: 'vs $231K actual in Aug', trend: 'up' },
              { label: 'Avg. Forecast MAPE',        value: '4.51%',   color: C.emerald, sub: 'Below 5% target threshold', trend: 'up' },
              { label: 'Reports Generated (MTD)',   value: '28',      color: C.violet,  sub: '6 scheduled · 22 on-demand', trend: 'up' },
              { label: 'Data Freshness',            value: '6h ago',  color: C.amber,   sub: 'Next sync in 18 minutes', trend: 'neutral' },
            ].map(k => (
              <div key={k.label} className="glass rounded-2xl p-4">
                <p className="text-xs font-medium mb-3" style={{ color: C.textMid }}>{k.label}</p>
                <p className="text-xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {k.trend !== 'neutral' && <span className="text-xs" style={{ color: k.trend === 'up' ? C.emerald : C.crimson }}>{k.trend === 'up' ? '↑' : '↓'}</span>}
                  <p className="text-xs" style={{ color: C.textSub }}>{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Revenue */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: C.text }}>Revenue: Forecast vs Actuals</h3>
                  <p className="text-xs mt-0.5" style={{ color: C.textSub }}>Apr – Sep 2026 · All categories</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reportRevData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue"  fill={C.indigo} opacity={0.75} radius={[4,4,0,0]} name="Actual Revenue" />
                  <Bar dataKey="forecast" fill={C.violet} opacity={0.4}  radius={[4,4,0,0]} name="Forecasted" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-3">
                <LegendItem color={C.indigo} label="Actual Revenue" fill />
                <LegendItem color={C.violet} label="Forecasted" fill />
              </div>
            </div>

            {/* MAPE trend */}
            <div className="glass rounded-2xl p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold" style={{ color: C.text }}>Weekly Forecast MAPE (%)</h3>
                <p className="text-xs mt-0.5" style={{ color: C.textSub }}>Mean absolute percentage error — lower is better</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={accuracyData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="mapeG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.emerald} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={[0, 8]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={5} stroke={C.amber} strokeDasharray="4 3" label={{ value: '5% threshold', fill: C.amber, fontSize: 10 }} />
                  <Area type="monotone" dataKey="mape" stroke={C.emerald} strokeWidth={2} fill="url(#mapeG)" name="MAPE (%)" dot={{ fill: C.emerald, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row: category share + radar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: C.text }}>Demand by Category</h3>
              <div className="flex flex-col gap-2.5">
                {categoryShareData.map((cat, i) => {
                  const colors = [C.indigo, C.violet, C.sky, C.emerald, C.amber, C.crimson, '#f472b6']
                  const col = colors[i % colors.length]
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: C.textMid }}>{cat.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono" style={{ color: C.textSub }}>{cat.units.toLocaleString()} units</span>
                          <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: col }}>{cat.pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'rgba(148,163,184,0.12)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${cat.pct * 3.2}%`, background: col, opacity: 0.75 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-1" style={{ color: C.text }}>Model Performance Radar</h3>
              <p className="text-xs mb-2" style={{ color: C.textSub }}>Prophet + LSTM Ensemble · Sep 2026</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={modelRadarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.2)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: C.textSub, fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                  <Radar name="Score" dataKey="score" stroke={C.indigo} fill={C.indigo} fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="flex flex-col gap-4">
          {/* Actions row */}
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: C.textSub }}>🔍</span>
                <input placeholder="Search reports…" className="rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.textMid, width: 220 }} />
              </div>
              {['All','Scheduled','On-Demand'].map(f => (
                <button key={f} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: 'rgba(148,163,184,0.08)', color: C.textSub, border: `1px solid ${C.border}` }}>
                  {f}
                </button>
              ))}
            </div>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              + New Report
            </button>
          </div>

          {/* Report table */}
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead style={{ background: 'rgba(248,250,255,0.8)', borderBottom: `1px solid ${C.border}` }}>
                <tr>
                  {['Report Name','Type','Last Generated','Format','Size','Status','Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold font-mono" style={{ color: C.textSub }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportsList.map((rpt, i) => (
                  <tr key={rpt.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(248,250,255,0.4)', borderBottom: `1px solid ${C.border}` }}>
                    <td className="py-3.5 px-4">
                      <p className="text-sm font-medium" style={{ color: C.text }}>{rpt.name}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>{rpt.id}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{ background: rpt.type === 'Scheduled' ? C.indigoBg : C.violetBg, color: rpt.type === 'Scheduled' ? C.indigo : C.violet, border: `1px solid ${rpt.type === 'Scheduled' ? C.indigoBdr : C.violetBdr}` }}>
                        {rpt.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono" style={{ color: C.textMid }}>{rpt.lastRun}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(148,163,184,0.10)', color: C.textMid, border: `1px solid ${C.border}` }}>
                        {rpt.format}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono" style={{ color: C.textSub }}>{rpt.size}</td>
                    <td className="py-3.5 px-4">
                      {rpt.status === 'generating' || generating === rpt.id ? (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full animate-pulse"
                          style={{ background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBdr}` }}>
                          Generating…
                        </span>
                      ) : (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{ background: C.emeraldBg, color: C.emerald, border: `1px solid ${C.emeraldBdr}` }}>
                          Ready
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1.5">
                        <button className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                          style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
                          ↓ Download
                        </button>
                        <button onClick={() => generate(rpt.id)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                          style={{ background: 'rgba(148,163,184,0.08)', color: C.textMid, border: `1px solid ${C.border}` }}>
                          ↻ Regenerate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Screen 6: Settings ───────────────────────────────────────────────────────

function Settings({ darkMode, setDarkMode, density, setDensity }: {
  darkMode: boolean; setDarkMode: (v: boolean) => void
  density: Density;  setDensity:  (v: Density) => void
}) {
  const [activeSection, setActiveSection] = useState('general')
  const [saved, setSaved] = useState(false)

  // Toggle state — darkMode is intentionally excluded; it lives in App root
  const [toggles, setToggles] = useState({
    emailAlerts: true, slackAlerts: false, erpSync: true, autoRetrain: true,
    anomalyPush: true, weeklyDigest: true, twoFactor: true,
    confidenceBands: true, anomalyHighlight: true,
  })
  const toggle = (key: keyof typeof toggles) => setToggles(p => ({ ...p, [key]: !p[key] }))

  const [modelConf, setModelConf]     = useState(85)
  const [safetyBuffer, setSafetyBuffer] = useState(20)
  const [retrainFreq, setRetrainFreq] = useState('Daily')
  const [timezone, setTimezone]       = useState('UTC-6 (CST)')
  const [currency, setCurrency]       = useState('USD ($)')
  const [forecastWindow, setForecastWindow] = useState('30 days')

  const save = () => {
    setSaved(true)
    api.saveSettings({
      timezone,
      currency,
      forecast_window: forecastWindow,
      model_confidence: `${modelConf}%`,
      safety_buffer: `${safetyBuffer}%`,
      retrain_frequency: retrainFreq,
    }).catch(console.error)
    setTimeout(() => setSaved(false), 2200)
  }

  const sections = [
    { id: 'general',       label: 'General',             icon: '⚙' },
    { id: 'forecasting',   label: 'Forecasting & Model', icon: '◈' },
    { id: 'notifications', label: 'Notifications',       icon: '🔔' },
    { id: 'integrations',  label: 'Integrations',        icon: '⬡' },
    { id: 'users',         label: 'Users & Permissions', icon: '◉' },
    { id: 'appearance',    label: 'Appearance',          icon: '◻' },
  ]

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: '200px 1fr' }}>
      {/* Settings sidebar */}
      <div className="glass rounded-2xl p-3 h-fit">
        <p className="text-xs font-semibold px-2 mb-2" style={{ color: C.textSub }}>SETTINGS</p>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all mb-0.5"
            style={{ background: activeSection === s.id ? C.indigoBg : 'transparent', color: activeSection === s.id ? C.indigo : C.textSub, border: `1px solid ${activeSection === s.id ? C.indigoBdr : 'transparent'}` }}>
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Main settings panel */}
      <div className="flex flex-col gap-4">
        {/* General */}
        {activeSection === 'general' && (
          <>
            <SettingsSection title="Organization" subtitle="Basic organization and regional preferences">
              <div className="grid grid-cols-2 gap-4">
                <SettingsField label="Organization Name">
                  <input defaultValue="Acme Retail Corp" className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }} />
                </SettingsField>
                <SettingsField label="Default Timezone">
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                    {['UTC-8 (PST)','UTC-7 (MST)','UTC-6 (CST)','UTC-5 (EST)','UTC+0 (GMT)','UTC+1 (CET)'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </SettingsField>
                <SettingsField label="Currency Display">
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                    {['USD ($)','EUR (€)','GBP (£)','JPY (¥)','CAD (C$)','INR (₹)'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </SettingsField>
                <SettingsField label="Default Forecast Window">
                  <select value={forecastWindow} onChange={e => setForecastWindow(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                    {['7 days','14 days','30 days','60 days','90 days'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </SettingsField>
              </div>
            </SettingsSection>

            <SettingsSection title="Security" subtitle="Authentication and access control">
              <ToggleRow label="Two-Factor Authentication" sub="Require 2FA for all users on login" on={toggles.twoFactor} onToggle={() => toggle('twoFactor')} />
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <SettingsField label="Session Timeout">
                  <select className="w-48 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                    {['30 minutes','1 hour','4 hours','8 hours','Never'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </SettingsField>
              </div>
            </SettingsSection>
          </>
        )}

        {/* Forecasting */}
        {activeSection === 'forecasting' && (
          <>
            <SettingsSection title="Model Configuration" subtitle="Adjust AI forecasting parameters and thresholds">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: C.textMid }}>Minimum Model Confidence</label>
                    <span className="text-sm font-bold font-mono" style={{ color: C.indigo }}>{modelConf}%</span>
                  </div>
                  <input type="range" min={50} max={99} value={modelConf} onChange={e => setModelConf(+e.target.value)}
                    className="w-full cursor-pointer accent-indigo-500" />
                  <p className="text-xs mt-1" style={{ color: C.textSub }}>Forecasts below this threshold will be flagged for review</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: C.textMid }}>Safety Stock Buffer (%)</label>
                    <span className="text-sm font-bold font-mono" style={{ color: C.emerald }}>{safetyBuffer}%</span>
                  </div>
                  <input type="range" min={5} max={50} value={safetyBuffer} onChange={e => setSafetyBuffer(+e.target.value)}
                    className="w-full cursor-pointer accent-indigo-500" />
                  <p className="text-xs mt-1" style={{ color: C.textSub }}>Added to calculated safety stock for risk mitigation</p>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <SettingsField label="Model Retraining Frequency">
                  <select value={retrainFreq} onChange={e => setRetrainFreq(e.target.value)} className="w-48 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                    {['Hourly','Every 6 hours','Daily','Weekly'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </SettingsField>
              </div>
            </SettingsSection>

            <SettingsSection title="Model Toggles" subtitle="Enable or disable forecasting features">
              <ToggleRow label="Auto-Retraining" sub="Automatically retrain model when MAPE exceeds threshold" on={toggles.autoRetrain} onToggle={() => toggle('autoRetrain')} />
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <ToggleRow label="Confidence Bands on Charts" sub="Show shaded confidence intervals on all forecast charts" on={toggles.confidenceBands} onToggle={() => toggle('confidenceBands')} />
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <ToggleRow label="Anomaly Highlighting" sub="Flag and highlight statistical anomalies on time-series views" on={toggles.anomalyHighlight} onToggle={() => toggle('anomalyHighlight')} />
              </div>
            </SettingsSection>

            <SettingsSection title="Active Models" subtitle="Forecasting engines currently in use">
              {[
                { name: 'Prophet + LSTM Ensemble', status: 'active', accuracy: '94.7%', updated: '6h ago' },
                { name: 'ARIMA Baseline',           status: 'standby', accuracy: '87.2%', updated: '2d ago' },
                { name: 'XGBoost Regressor',        status: 'active', accuracy: '91.1%', updated: '6h ago' },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{m.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>Last updated: {m.updated}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold font-mono" style={{ color: C.emerald }}>{m.accuracy}</span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                      style={{ background: m.status === 'active' ? C.emeraldBg : 'rgba(148,163,184,0.10)', color: m.status === 'active' ? C.emerald : C.textSub, border: `1px solid ${m.status === 'active' ? C.emeraldBdr : C.border}` }}>
                      {m.status === 'active' ? '● Active' : '○ Standby'}
                    </span>
                  </div>
                </div>
              ))}
            </SettingsSection>
          </>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <SettingsSection title="Alert Channels & Preferences" subtitle="Choose how and when you receive forecasting and inventory alerts">
            <div className="flex flex-col gap-0">
              {[
                { key: 'emailAlerts' as const,   label: 'Email Alerts',          sub: 'Send critical and warning alerts to jordan.kim@acmeretail.com' },
                { key: 'slackAlerts' as const,   label: 'Slack Notifications',   sub: 'Post alerts to #supply-chain-ops channel (not connected)' },
                { key: 'anomalyPush' as const,   label: 'Anomaly Push Alerts',   sub: 'Real-time push notification when a new anomaly is detected' },
                { key: 'weeklyDigest' as const,  label: 'Weekly Digest Email',   sub: 'Summary of forecast performance and inventory actions every Monday' },
              ].map((row, i, arr) => (
                <div key={row.key} className="py-3.5" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : undefined }}>
                  <ToggleRow label={row.label} sub={row.sub} on={toggles[row.key]} onToggle={() => toggle(row.key)} />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <SettingsField label="Alert Severity Threshold">
                <select className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                  {['All Alerts','Warnings & Above','Critical Only'].map(o => <option key={o}>{o}</option>)}
                </select>
              </SettingsField>
              <SettingsField label="Quiet Hours">
                <select className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none font-mono cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, color: C.text }}>
                  {['None','10 PM – 7 AM','Weekends Only'].map(o => <option key={o}>{o}</option>)}
                </select>
              </SettingsField>
            </div>
          </SettingsSection>
        )}

        {/* Integrations */}
        {activeSection === 'integrations' && (
          <SettingsSection title="Connected Systems" subtitle="Manage ERP, WMS, and data pipeline integrations">
            <ToggleRow label="ERP Auto-Sync (SAP S/4HANA)" sub="Automatically push approved purchase orders to SAP every 4 hours" on={toggles.erpSync} onToggle={() => toggle('erpSync')} />
            <div className="mt-4 grid gap-3">
              {[
                { name: 'SAP S/4HANA', status: 'connected', icon: '⬡', color: C.emerald, detail: 'Last sync: 2h ago · 1,240 records' },
                { name: 'Snowflake Data Warehouse', status: 'connected', icon: '❄', color: C.sky, detail: 'Last sync: 15 min ago · Pipeline healthy' },
                { name: 'Shopify Storefront',        status: 'connected', icon: '⬢', color: C.emerald, detail: 'Real-time webhook · 14 events today' },
                { name: 'Oracle WMS',                status: 'disconnected', icon: '⬡', color: C.textSub, detail: 'Not connected · Click to configure' },
                { name: 'Microsoft Teams',           status: 'disconnected', icon: '◈', color: C.textSub, detail: 'Not connected · Click to configure' },
              ].map(intg => (
                <div key={intg.name} className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.45)', border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: intg.status === 'connected' ? C.emeraldBg : 'rgba(148,163,184,0.10)', border: `1px solid ${intg.status === 'connected' ? C.emeraldBdr : C.border}` }}>
                      <span style={{ color: intg.color, fontSize: 16 }}>{intg.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>{intg.name}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: C.textSub }}>{intg.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                      style={{ background: intg.status === 'connected' ? C.emeraldBg : 'rgba(148,163,184,0.08)', color: intg.status === 'connected' ? C.emerald : C.textSub, border: `1px solid ${intg.status === 'connected' ? C.emeraldBdr : C.border}` }}>
                      {intg.status === 'connected' ? '● Connected' : '○ Disconnected'}
                    </span>
                    <button className="text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer"
                      style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
                      {intg.status === 'connected' ? 'Configure' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        )}

        {/* Users */}
        {activeSection === 'users' && (
          <SettingsSection title="Team Members" subtitle="Manage user roles and access permissions">
            <div className="flex justify-end mb-3">
              <button className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
                + Invite User
              </button>
            </div>
            {[
              { name: 'Jordan Kim',       email: 'jordan.kim@acmeretail.com',   role: 'Admin',    avatar: 'JK', status: 'active' },
              { name: 'Priya Sharma',     email: 'priya.sharma@acmeretail.com', role: 'Manager',  avatar: 'PS', status: 'active' },
              { name: 'Luis Fernández',   email: 'l.fernandez@acmeretail.com',  role: 'Analyst',  avatar: 'LF', status: 'active' },
              { name: 'Aisha Okonkwo',    email: 'a.okonkwo@acmeretail.com',    role: 'Viewer',   avatar: 'AO', status: 'active' },
              { name: 'Sam Chen',         email: 'sam.chen@acmeretail.com',     role: 'Analyst',  avatar: 'SC', status: 'invited' },
            ].map(user => {
              const roleColor: Record<string, string> = { Admin: C.crimson, Manager: C.indigo, Analyst: C.violet, Viewer: C.textSub }
              const roleBg:    Record<string, string> = { Admin: C.crimsonBg, Manager: C.indigoBg, Analyst: C.violetBg, Viewer: 'rgba(148,163,184,0.10)' }
              return (
                <div key={user.email} className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>{user.name}</p>
                      <p className="text-xs font-mono" style={{ color: C.textSub }}>{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.status === 'invited' && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBdr}` }}>Pending</span>
                    )}
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                      style={{ background: roleBg[user.role], color: roleColor[user.role] }}>
                      {user.role}
                    </span>
                    <button className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                      style={{ background: 'rgba(148,163,184,0.08)', color: C.textMid, border: `1px solid ${C.border}` }}>
                      Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </SettingsSection>
        )}

        {/* Appearance */}
        {activeSection === 'appearance' && (
          <SettingsSection title="Display & Theme" subtitle="Customize the visual presentation of DemandAI">
            <ToggleRow label="Dark Mode" sub="Switch to dark slate navy interface — takes effect immediately" on={darkMode} onToggle={() => setDarkMode(!darkMode)} />
            <div className="mt-4 pt-4 grid grid-cols-3 gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <p className="text-xs font-semibold col-span-3 mb-1" style={{ color: C.textMid }}>Accent Color</p>
              {[
                { name: 'Indigo', color: '#6366f1' }, { name: 'Violet', color: '#7c3aed' },
                { name: 'Sky', color: '#0ea5e9' },    { name: 'Emerald', color: '#059669' },
                { name: 'Amber', color: '#d97706' },  { name: 'Rose', color: '#e11d48' },
              ].map(acc => (
                <button key={acc.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                  style={{ background: 'rgba(255,255,255,0.5)', border: `1px solid ${C.border}` }}>
                  <span className="w-4 h-4 rounded-full" style={{ background: acc.color }} />
                  <span className="text-xs font-medium" style={{ color: C.textMid }}>{acc.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.textMid }}>Display Density</p>
              <p className="text-xs mb-3" style={{ color: C.textSub }}>Controls spacing and padding across tables and cards.</p>
              <div className="flex gap-2">
                {(['Compact','Standard','Comfortable'] as Density[]).map(d => (
                  <button key={d} onClick={() => setDensity(d)}
                    className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                    style={{
                      background: density === d ? C.indigoBg : 'rgba(148,163,184,0.08)',
                      color: density === d ? C.indigo : C.textSub,
                      border: `1px solid ${density === d ? C.indigoBdr : C.border}`,
                      fontWeight: density === d ? 600 : 400,
                    }}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-4">
                {[
                  { d: 'Compact',     desc: 'Tight rows, more data per screen' },
                  { d: 'Standard',    desc: 'Balanced — default layout' },
                  { d: 'Comfortable', desc: 'Relaxed spacing, easier to scan' },
                ].map(({ d, desc }) => (
                  <p key={d} className="text-xs" style={{ color: density === d ? C.indigo : C.textSub, flex: 1 }}>
                    <span className="font-semibold">{d}:</span> {desc}
                  </p>
                ))}
              </div>
            </div>
          </SettingsSection>
        )}

        {/* Save bar */}
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: C.textSub }}>Changes apply immediately to your session. Some settings may require a page refresh.</p>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'rgba(148,163,184,0.10)', color: C.textMid, border: `1px solid ${C.border}` }}>
              Reset to Defaults
            </button>
            <button onClick={save} className="px-6 py-2 rounded-xl text-sm font-bold cursor-pointer text-white transition-all"
              style={{ background: saved ? C.emerald : 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              {saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-semibold" style={{ color: C.text }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: C.textSub }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: C.textMid }}>{label}</label>
      {children}
    </div>
  )
}

function ToggleRow({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium" style={{ color: C.text }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: C.textSub }}>{sub}</p>
      </div>
      <button onClick={onToggle} className="relative shrink-0 cursor-pointer transition-all"
        style={{ width: 44, height: 24, borderRadius: 12, background: on ? C.indigo : 'rgba(148,163,184,0.25)' }}>
        <span className="absolute top-0.5 transition-all rounded-full bg-white shadow"
          style={{ width: 20, height: 20, left: on ? 22 : 2 }} />
      </button>
    </div>
  )
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────

type ChatMsg = { role: 'user' | 'bot'; text: string; timestamp: string }

const BOT_SUGGESTIONS = [
  'When should I reorder WH-1000XM5?',
  'Which SKUs need reorder this week?',
  'Show me critical stock items',
  'What is the reorder point for iPhone 15 Pro?',
  'Which products are overstocked?',
]

function chatTimestamp() {
  const now = new Date()
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Compute avg monthly sales growth from historical salesData (actual values only)
const historicalGrowthRate = (() => {
  const actuals = salesData.filter(d => d.actual != null).map(d => d.actual as number)
  if (actuals.length < 2) return 0
  const growth = (actuals[actuals.length - 1] - actuals[0]) / actuals[0]
  return growth / (actuals.length - 1) // per-period growth
})()

function buildLiveRows(stocks: Record<string, number>) {
  const TODAY = new Date('2026-09-17')
  return inventoryData.map(item => {
    const stock        = stocks[item.sku] ?? item.stock
    const baseDaily    = item.demand30 / 30
    // Adjust daily rate slightly upward if historical trend is positive
    const trendFactor  = 1 + Math.max(0, historicalGrowthRate * 2)
    const dailyRate    = baseDaily * trendFactor
    const daysOfSupply = dailyRate > 0 ? Math.floor(stock / dailyRate) : 999
    const reorderPoint = Math.ceil(dailyRate * item.lead + item.safety)
    const daysToReorder = dailyRate > 0 ? Math.max(0, Math.floor((stock - reorderPoint) / dailyRate)) : 999
    const reorderDate  = new Date(TODAY)
    reorderDate.setDate(reorderDate.getDate() + daysToReorder)
    const reorderDateStr = daysToReorder <= 0
      ? 'TODAY — overdue!'
      : reorderDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    const status       = deriveStatus(stock, item.demand30, item.lead, item.safety)
    const isEdited     = stock !== item.stock
    return { ...item, stock, dailyRate, daysOfSupply, daysToReorder, reorderDateStr, status, reorderPoint, isEdited }
  })
}

function generateBotReply(input: string, stocks: Record<string, number>): string {
  const q    = input.toLowerCase()
  const rows = buildLiveRows(stocks)

  // Historical context sentence
  const lastActuals = salesData.filter(d => d.actual != null)
  const recentSales = lastActuals[lastActuals.length - 1]?.actual ?? 0
  const prevSales   = lastActuals[lastActuals.length - 2]?.actual ?? recentSales
  const trendPct    = prevSales ? (((recentSales - prevSales) / prevSales) * 100).toFixed(1) : '0.0'
  const trendDir    = Number(trendPct) >= 0 ? `↑ +${trendPct}%` : `↓ ${trendPct}%`
  const trendNote   = `Historical trend: demand ${trendDir} (Aug 21→28). Reorder dates adjusted accordingly.`
  const editedSkus  = rows.filter(r => r.isEdited).map(r => r.sku)
  const liveNote    = editedSkus.length > 0 ? `\n📝 Using your updated stock for: ${editedSkus.join(', ')}.` : ''

  // Match a specific SKU or product name
  const matched = rows.find(r =>
    q.includes(r.sku.toLowerCase()) ||
    r.name.toLowerCase().split(' ').some(w => w.length > 3 && q.includes(w.toLowerCase()))
  )

  if (matched) {
    const r = matched
    const editedTag = r.isEdited ? ' *(stock manually updated)*' : ''
    const urgency   = r.status === 'critical' ? '🔴 CRITICAL' : r.status === 'warning' ? '🟡 AT RISK' : r.status === 'overstock' ? '🟣 OVERSTOCK' : '🟢 OPTIMAL'
    if (r.status === 'overstock') {
      return `${urgency} — **${r.name}** (${r.sku})${editedTag}\n\nNo reorder needed right now.\nCurrent stock: ${r.stock.toLocaleString()} units (${Math.round(r.stock / r.safety)}× safety stock)\nDays of supply: ${r.daysOfSupply}d\nDaily burn rate: ${r.dailyRate.toFixed(1)} units/day\n\nConsider promotions or stock redistribution to cut holding costs.\n\n${trendNote}`
    }
    if (r.daysToReorder <= 0) {
      return `${urgency} — **${r.name}** (${r.sku})${editedTag}\n\n⚠️ Reorder is OVERDUE — place an order immediately!\n\nCurrent stock: ${r.stock.toLocaleString()} units\nReorder point: ${r.reorderPoint} units\nDays of supply left: ${r.daysOfSupply}d\nLead time: ${r.lead} days\n\nOrder quantity needed: **${r.reorderPoint} units**\n\n${trendNote}${liveNote}`
    }
    return `${urgency} — **${r.name}** (${r.sku})${editedTag}\n\n📅 Reorder date: **${r.reorderDateStr}**\nDays until reorder: ${r.daysToReorder}d\n\nCurrent stock: ${r.stock.toLocaleString()} units\nReorder point: ${r.reorderPoint} units\nDays of supply: ${r.daysOfSupply}d\nDaily burn rate: ${r.dailyRate.toFixed(1)} units/day\nLead time: ${r.lead} days · Safety stock: ${r.safety} units\n\n${trendNote}${liveNote}`
  }

  // Critical / urgent
  if (q.includes('critical') || q.includes('urgent') || q.includes('stockout') || q.includes('immediate') || q.includes('overdue')) {
    const crit = rows.filter(r => r.status === 'critical')
    if (crit.length === 0) return `🟢 No critical items right now. All SKUs are within safe levels.\n\n${trendNote}`
    const lines = crit.map(r => `• **${r.name}** — reorder **${r.reorderDateStr}** (${r.daysOfSupply}d left)`)
    return `🔴 ${crit.length} critical SKUs:\n\n${lines.join('\n')}\n\nPlace purchase orders immediately to prevent stockout.\n\n${trendNote}${liveNote}`
  }

  // This week / soon
  if (q.includes('week') || q.includes('soon') || q.includes('upcoming') || q.includes('next')) {
    const days = q.includes('14') || q.includes('fortnight') ? 14 : q.includes('30') || q.includes('month') ? 30 : 7
    const due  = rows.filter(r => r.daysToReorder <= days && r.status !== 'overstock').sort((a, b) => a.daysToReorder - b.daysToReorder)
    if (due.length === 0) return `🟢 No reorders due in the next ${days} days. Looking healthy!\n\n${trendNote}`
    const lines = due.map(r => {
      const icon = r.status === 'critical' ? '🔴' : '🟡'
      return `${icon} **${r.name}** — reorder **${r.reorderDateStr}** (in ${Math.max(0, r.daysToReorder)}d)`
    })
    return `📅 ${due.length} SKUs need reorder within ${days} days:\n\n${lines.join('\n')}\n\n${trendNote}${liveNote}`
  }

  // Overstock
  if (q.includes('overstock') || q.includes('excess') || q.includes('too much')) {
    const over = rows.filter(r => r.status === 'overstock')
    if (over.length === 0) return '🟢 No overstocked items detected.'
    const lines = over.map(r => `• **${r.name}** — ${r.stock.toLocaleString()} units (${r.daysOfSupply}d supply, ${Math.round(r.stock / r.safety)}× safety)`)
    return `🟣 ${over.length} overstocked SKUs:\n\n${lines.join('\n')}\n\nConsider markdowns or redistribution.\n\n${trendNote}`
  }

  // All reorders / list
  if (q.includes('reorder') || q.includes('all') || q.includes('which') || q.includes('list') || q.includes('show') || q.includes('need')) {
    const need = rows.filter(r => r.status !== 'overstock' && r.status !== 'optimal').sort((a, b) => a.daysToReorder - b.daysToReorder)
    if (need.length === 0) return `🟢 All SKUs are at optimal levels. No reorders needed right now.\n\n${trendNote}`
    const lines = need.map(r => {
      const icon = r.status === 'critical' ? '🔴' : '🟡'
      return `${icon} **${r.name}** — reorder **${r.reorderDateStr}**`
    })
    return `📦 ${need.length} SKUs need reordering:\n\n${lines.join('\n')}\n\n${trendNote}${liveNote}`
  }

  // Summary / health
  if (q.includes('summary') || q.includes('overview') || q.includes('status') || q.includes('health') || q.includes('report')) {
    const crit = rows.filter(r => r.status === 'critical').length
    const warn = rows.filter(r => r.status === 'warning').length
    const over = rows.filter(r => r.status === 'overstock').length
    const ok   = rows.filter(r => r.status === 'optimal').length
    return `📊 **Inventory Health — Sep 17, 2026**\n\n🔴 Critical: ${crit} SKUs\n🟡 At Risk: ${warn} SKUs\n🟢 Optimal: ${ok} SKUs\n🟣 Overstock: ${over} SKUs\nTotal: ${rows.length} SKUs\n\n${trendNote}${liveNote}`
  }

  // Trend / history
  if (q.includes('trend') || q.includes('history') || q.includes('historical') || q.includes('sales') || q.includes('demand')) {
    const recent = salesData.filter(d => d.actual).slice(-3)
    const lines  = recent.map(d => `• ${d.date}: ${(d.actual as number).toLocaleString()} units sold`)
    return `📈 **Recent Sales History**\n\n${lines.join('\n')}\n\nTrend: demand ${trendDir} over last two periods.\nForecasted demand (Sep 18): ~${salesData.find(d => d.date === 'Sep 18')?.predicted?.toLocaleString() ?? 'N/A'} units\n\nReorder dates already reflect this trend.`
  }

  return `I can answer reorder questions using your **live stock levels** and **historical sales trends**. Try:\n\n• "When should I reorder WH-1000XM5?"\n• "Which SKUs are critical this week?"\n• "Show all upcoming reorders"\n• "Inventory health summary"\n• "Historical demand trend"\n\nOr type any product name or SKU ID.`
}

function Chatbot({ stocks }: { stocks: Record<string, number> }) {
  const { darkMode } = useTheme()
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState<ChatMsg[]>([{
    role: 'bot',
    text: '👋 Hello! I\'m your AI inventory assistant.\n\nI can predict **reorder dates**, flag **critical stock**, and analyse **demand trends** based on your live inventory data.\n\nWhat would you like to know?',
    timestamp: chatTimestamp(),
  }])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const bottomRef             = React.useRef<HTMLDivElement>(null)

  const txt    = darkMode ? '#e2e8f0' : C.text
  const txtSub = darkMode ? '#475569' : C.textSub
  const bdr    = darkMode ? 'rgba(30,45,69,0.8)' : C.border
  const panelBg = darkMode ? 'rgba(13,19,32,0.97)' : 'rgba(255,255,255,0.92)'

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, typing])

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMsg = { role: 'user', text: text.trim(), timestamp: chatTimestamp() }
    setMsgs(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)
    api.chat(text.trim())
      .then(res => {
        setMsgs(prev => [...prev, { role: 'bot', text: res.reply, timestamp: chatTimestamp() }])
        setTyping(false)
      })
      .catch(() => {
        const reply = generateBotReply(text, stocks)
        setMsgs(prev => [...prev, { role: 'bot', text: reply, timestamp: chatTimestamp() }])
        setTyping(false)
      })
  }

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return <p key={i} className="leading-relaxed" style={{ marginBottom: line === '' ? 6 : 0 }} dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />
    })
  }

  return (
    <>
      {/* Floating toggle button — sits above everything, no wrapper */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
          boxShadow: '0 8px 28px rgba(99,102,241,0.45)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: open ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.15s',
          zIndex: 9999,
        }}
        title="AI Inventory Assistant"
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>{open ? '✕' : '🤖'}</span>
      </button>

      {/* Chat panel — independent fixed element, no wrapper */}
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 88, right: 24,
            width: 370, height: 540,
            display: 'flex', flexDirection: 'column',
            borderRadius: 20, overflow: 'hidden',
            background: panelBg,
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${bdr}`,
            boxShadow: '0 24px 64px rgba(99,102,241,0.18), 0 4px 16px rgba(0,0,0,0.14)',
            zIndex: 9998,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${bdr}`, background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(124,58,237,0.08))' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
              🤖
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: txt }}>AI Inventory Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.emerald }} />
                <span className="text-xs font-mono" style={{ color: C.emerald }}>Live · 10 SKUs tracked</span>
              </div>
            </div>
            <button onClick={() => setMsgs(prev => [prev[0]])}
              className="text-xs px-2 py-1 rounded-lg cursor-pointer"
              style={{ background: 'rgba(148,163,184,0.12)', color: txtSub, border: `1px solid ${bdr}` }}>
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {msgs.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
                    color: 'white',
                    borderBottomRightRadius: 4,
                  } : {
                    background: darkMode ? 'rgba(17,24,39,0.85)' : 'rgba(248,250,255,0.9)',
                    border: `1px solid ${bdr}`,
                    color: txt,
                    borderBottomLeftRadius: 4,
                  }}
                >
                  <div style={{ lineHeight: 1.55 }}>{formatText(msg.text)}</div>
                  <p className="mt-1.5 text-right" style={{ fontSize: 10, opacity: 0.55, color: msg.role === 'user' ? 'white' : txtSub }}>{msg.timestamp}</p>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                  style={{ background: darkMode ? 'rgba(17,24,39,0.85)' : 'rgba(248,250,255,0.9)', border: `1px solid ${bdr}`, borderBottomLeftRadius: 4 }}>
                  {[0,1,2].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: C.indigo, animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {msgs.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {BOT_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all"
                  style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBdr}` }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 shrink-0" style={{ borderTop: `1px solid ${bdr}` }}>
            <div className="flex gap-2 pt-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Ask about reorder dates, stock levels…"
                className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono"
                style={{ background: darkMode ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.8)', border: `1px solid ${bdr}`, color: txt }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || typing}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer transition-all shrink-0"
                style={{ background: input.trim() && !typing ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : 'rgba(148,163,184,0.2)' }}
              >
                <span style={{ fontSize: 14 }}>↑</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]     = useState<Screen>('dashboard')
  const [dateRange, setDateRange] = useState('Last 90 Days')
  const [darkMode, setDarkMode]  = useState(false)
  const [density, setDensity]    = useState<Density>('Standard')
  const [stocks, setStocks]      = useState<Record<string, number>>(
    () => Object.fromEntries(inventoryData.map(i => [i.sku, i.stock]))
  )

  React.useEffect(() => {
    api.getInventory().then(items => {
      if (items && items.length > 0) {
        setStocks(Object.fromEntries(items.map(i => [i.sku, i.stock])))
      }
    }).catch(console.error)
  }, [])

  // Keep body class in sync for CSS overrides
  useMemo(() => {
    document.body.classList.toggle('dark-mode', darkMode)
  }, [darkMode])

  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')

  // Global search index: all SKUs + products
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return inventoryData
      .filter(item =>
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [searchQuery])

  const openAlertCount = 4

  const navItems: { icon: string; label: string; screen: Screen; badge?: number }[] = [
    { icon: '⬛', label: 'Dashboard',          screen: 'dashboard' },
    { icon: '◈', label: 'Forecast Analytics', screen: 'analytics' },
    { icon: '▦', label: 'Inventory & Stock',  screen: 'inventory' },
    { icon: '◉', label: 'Anomaly Alerts',     screen: 'anomalies', badge: openAlertCount },
    { icon: '▤', label: 'Reports',            screen: 'reports' },
    { icon: '⚙', label: 'Settings',           screen: 'settings' },
  ]

  const titles: Record<Screen, string> = {
    dashboard: 'Executive Dashboard',
    analytics: 'Product Forecast Analytics',
    inventory: 'Inventory & Reorder Center',
    anomalies: 'Anomaly Alerts',
    reports:   'Reports & Analytics',
    settings:  'Settings',
  }

  // Density → row-padding and card-padding CSS variables
  const densityVars: React.CSSProperties = {
    ['--row-py'  as string]: density === 'Compact' ? '6px'  : density === 'Comfortable' ? '14px' : '10px',
    ['--card-p'  as string]: density === 'Compact' ? '12px' : density === 'Comfortable' ? '24px' : '20px',
    ['--gap'     as string]: density === 'Compact' ? '12px' : density === 'Comfortable' ? '24px' : '20px',
  }

  const rootStyle: React.CSSProperties = {
    ...(darkMode ? darkVars : {}),
    ...densityVars,
  }

  // Dynamic colour tokens that react to dark mode
  const bg        = darkMode ? '#0b0f1a'                   : undefined
  const sidebarBg = darkMode ? 'rgba(13,19,32,0.97)'       : undefined
  const headerBg  = darkMode ? 'rgba(13,19,32,0.97)'       : undefined
  const glassBg   = darkMode ? 'rgba(17,24,39,0.80)'       : undefined
  const glassBdr  = darkMode ? 'rgba(30,45,69,0.9)'        : undefined
  const txt       = darkMode ? '#e2e8f0'                   : C.text
  const txtMid    = darkMode ? '#94a3b8'                   : C.textMid
  const txtSub    = darkMode ? '#475569'                   : C.textSub
  const bdr       = darkMode ? 'rgba(30,45,69,0.8)'        : C.border
  const insetBg   = darkMode ? 'rgba(11,15,26,0.6)'        : 'rgba(255,255,255,0.45)'

  return (
    <ThemeCtx.Provider value={{ darkMode, density }}>
    <div className={`flex h-screen overflow-hidden${darkMode ? ' dark-mode' : ''}`} style={{ ...rootStyle, background: bg, transition: 'background 0.3s' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col transition-colors duration-300"
        style={{
          background: sidebarBg ?? 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderRight: `1px solid ${darkMode ? 'rgba(30,45,69,0.8)' : 'rgba(255,255,255,0.85)'}`,
          boxShadow: '2px 0 20px rgba(99,120,200,0.07)',
        }}>
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${bdr}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
              D
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: txt }}>
              Demand<span style={{ color: C.indigo }}>AI</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase px-3 mb-1 mt-1">Navigation</p>
          {navItems.map(item => (
            <NavItem key={item.label} icon={item.icon} label={item.label}
              active={screen === item.screen}
              onClick={() => setScreen(item.screen)}
              badge={item.badge} />
          ))}
        </nav>
        <div className="px-3 py-3 space-y-2" style={{ borderTop: `1px solid ${bdr}` }}>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
            style={{ background: C.emeraldBg, border: `1px solid ${C.emeraldBdr}` }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.emerald }} />
            <span className="text-xs font-mono" style={{ color: C.emerald }}>FastAPI AI Backend Online</span>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl cursor-pointer">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
              JK
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: txt }}>Jordan Kim</p>
              <p className="text-xs truncate" style={{ color: txtSub }}>Supply Chain Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 flex items-center gap-4 px-5 transition-colors duration-300"
          style={{
            background: headerBg ?? 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderBottom: `1px solid ${bdr}`,
            boxShadow: '0 2px 16px rgba(99,120,200,0.08)',
          }}>
          <h1 className="text-sm font-semibold mr-2" style={{ color: txt }}>{titles[screen]}</h1>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: txtSub }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Search SKU or product name…"
                className="w-full rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono focus:outline-none transition-all duration-200"
                style={{ background: darkMode ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.7)', border: `1px solid ${searchFocused ? 'rgba(99,102,241,0.5)' : bdr}`, color: txtMid, boxShadow: searchFocused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                  style={{ color: txtSub }}>✕</button>
              )}
              {/* Search results dropdown */}
              {searchFocused && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                  style={{ background: darkMode ? 'rgba(13,19,32,0.98)' : 'rgba(255,255,255,0.98)', border: `1px solid ${bdr}`, boxShadow: '0 12px 32px rgba(99,102,241,0.14)' }}>
                  <p className="px-3 py-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: txtSub, borderBottom: `1px solid ${bdr}` }}>Products & SKUs</p>
                  {searchResults.map(item => {
                    const statusColor = item.status === 'critical' ? C.crimson : item.status === 'warning' ? C.amber : item.status === 'overstock' ? C.violet : C.emerald
                    return (
                      <button key={item.sku}
                        onMouseDown={() => { setScreen('inventory'); setSearchQuery(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors"
                        style={{ borderBottom: `1px solid ${bdr}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: txt }}>{item.name}</p>
                          <p className="text-xs font-mono" style={{ color: txtSub }}>{item.sku} · Stock: {item.stock.toLocaleString()}</p>
                        </div>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: statusColor + '22', color: statusColor }}>
                          {item.status === 'critical' ? 'Critical' : item.status === 'warning' ? 'At Risk' : item.status === 'overstock' ? 'Overstock' : 'Optimal'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {searchFocused && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl p-4 text-center z-50"
                  style={{ background: darkMode ? 'rgba(13,19,32,0.98)' : 'rgba(255,255,255,0.98)', border: `1px solid ${bdr}`, boxShadow: '0 12px 32px rgba(99,102,241,0.14)' }}>
                  <p className="text-xs" style={{ color: txtSub }}>No products or SKUs match "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer transition-colors duration-300"
              style={{ background: darkMode ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.7)', border: `1px solid ${bdr}`, color: txtMid }}>
              {['Last 7 Days','Last 30 Days','Last 90 Days','Last 12 Months','Custom Range…'].map(o => <option key={o}>{o}</option>)}
            </select>
            <button className="relative p-2 rounded-xl cursor-pointer"
              style={{ background: darkMode ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.6)', border: `1px solid ${bdr}` }}>
              <span className="text-sm">🔔</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                style={{ background: C.crimson, borderColor: darkMode ? '#0b0f1a' : 'white' }} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 transition-colors duration-300"
          style={{ background: darkMode ? 'rgba(11,15,26,0.6)' : undefined }}>
          {screen === 'dashboard' && <Dashboard setScreen={setScreen} dateRange={dateRange} />}
          {screen === 'analytics' && <Analytics dateRange={dateRange} />}
          {screen === 'inventory' && <Inventory stocks={stocks} setStocks={setStocks} dateRange={dateRange} />}
          {screen === 'anomalies' && <AnomalyAlerts />}
          {screen === 'reports'   && <Reports />}
          {screen === 'settings'  && <Settings darkMode={darkMode} setDarkMode={setDarkMode} density={density} setDensity={setDensity} />}
        </main>
      </div>
      <Chatbot stocks={stocks} />
    </div>
    </ThemeCtx.Provider>
  )
}
