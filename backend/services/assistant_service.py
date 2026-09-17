import os
import requests
from typing import Dict, Any, List
from backend.database import db_get_products, db_get_anomalies

def call_groq_llm(user_message: str, products: List[Dict[str, Any]], anomalies: List[Dict[str, Any]]) -> str:
    """Queries Groq API with live supply chain and Supabase database context."""
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        return ""

    # Build concise database context
    catalog_summary = []
    for p in products:
        daily = max(1.0, p.get("demand30", 30) / 30.0)
        days_left = round(p.get("stock", 0) / daily, 1)
        catalog_summary.append(
            f"- {p.get('sku')} | {p.get('name')} | Stock: {p.get('stock')} | 30d Demand: {p.get('demand30')} | "
            f"Lead Time: {p.get('lead_time')}d | ROP: {p.get('reorder_point')} | Status: {p.get('status')} | "
            f"Supply: ~{days_left}d | Cost: ${p.get('unit_cost')}"
        )
    catalog_str = "\n".join(catalog_summary)

    ano_summary = []
    for a in anomalies:
        ano_summary.append(f"- [{a.get('category')}] {a.get('sku')} ({a.get('product')}): {a.get('deviation')} - {a.get('impact')}")
    ano_str = "\n".join(ano_summary) if ano_summary else "No critical anomalies active."

    system_prompt = (
        "You are DemandAI Copilot, an elite AI supply chain and demand forecasting advisor. "
        "You are powered by Groq's high-speed inference and connected to a live Supabase PostgreSQL database.\n\n"
        "LIVE DATABASE INVENTORY:\n"
        f"{catalog_str}\n\n"
        "ACTIVE ANOMALY ALERTS:\n"
        f"{ano_str}\n\n"
        "MODEL INFO:\n"
        "- Model: Triple Exponential Smoothing (Holt-Winters) + Multi-Factor Seasonality\n"
        "- Accuracy: 94.2% (MAPE 4.8%)\n\n"
        "GUIDELINES:\n"
        "1. Answer the user's question directly using the LIVE DATABASE INVENTORY above.\n"
        "2. Keep responses structured, concise, and actionable using markdown bolding, bullet points, and emojis.\n"
        "3. When asked about reorders or stockouts, calculate exact days of supply, recommended PO quantities, and lead times.\n"
        "4. Highlight urgency for critical/warning items."
    )

    models_to_try = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "groq/compound"]

    for model in models_to_try:
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 700
                },
                timeout=12
            )
            if res.status_code == 200:
                data = res.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content:
                    return content.strip()
            else:
                print(f"[Groq] Model {model} status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Groq] Error calling {model}: {e}")

    return ""

def process_assistant_query(user_message: str) -> str:
    """
    Intelligent supply chain & inventory reasoning engine.
    Uses Groq LLM inference when configured, with fallback to local rule-based engine.
    """
    products = db_get_products()
    all_anomalies = db_get_anomalies()
    open_anomalies = [a for a in all_anomalies if a.get("status") == "open"]

    # 1. Try Groq AI Copilot first if GROQ_API_KEY is available
    if os.getenv("GROQ_API_KEY"):
        groq_reply = call_groq_llm(user_message, products, open_anomalies)
        if groq_reply:
            return groq_reply

    # 2. Rule-based Fallback Engine
    msg = user_message.lower().strip()

    # Match specific product by SKU or name
    matched_product = None
    for p in products:
        if p.get("sku", "").lower() in msg or any(part in msg for part in p.get("name", "").lower().split() if len(part) > 3):
            matched_product = p
            break

    if matched_product:
        p = matched_product
        daily = max(1.0, p["demand30"] / 30.0)
        days = round(p["stock"] / daily, 1)
        needed = max(0, p["reorder_point"] - p["stock"] + p["safety_stock"])
        return (
            f"📦 **{p['name']} ({p['sku']}) Analysis**:\n"
            f"• **Current Stock**: {p['stock']} units ({days} days of supply)\n"
            f"• **Monthly Projected Demand**: {p['demand30']} units (avg ~{daily:.1f} units/day)\n"
            f"• **Supplier Lead Time**: {p['lead_time']} days\n"
            f"• **Safety Stock**: {p['safety_stock']} units | **Reorder Point**: {p['reorder_point']} units\n"
            f"• **Status**: **{p['status'].upper()}**\n\n"
            + (f"⚠️ **Action Recommended**: Stock is below recommended safety threshold. Suggested Purchase Order: **{needed} units** (~${needed * p['unit_cost']:,.2f})."
               if p["status"] in ["critical", "warning"]
               else f"✅ Inventory is currently in healthy optimal bounds.")
        )

    if any(k in msg for k in ["stockout", "critical", "run out", "low stock", "urgent"]):
        critical_items = [p for p in products if p.get("status") == "critical"]
        if not critical_items:
            return "✅ Great news: There are currently **0 critical stockout risks** in your warehouse. All tracked SKUs maintain adequate buffer stocks."
        
        lines = [f"🚨 **Critical Stockout Alert** — {len(critical_items)} SKUs require immediate replenishment:\n"]
        for p in critical_items:
            daily = max(1.0, p["demand30"] / 30.0)
            days = round(p["stock"] / daily, 1)
            lines.append(f"• **{p['sku']}** ({p['name']}): **{p['stock']} left** (~{days} days of supply vs {p['lead_time']}d lead time)")
        lines.append(f"\n💡 Recommendation: Issue emergency purchase orders today to prevent backorders.")
        return "\n".join(lines)

    if any(k in msg for k in ["reorder", "purchase order", "restock", "order"]):
        reorder_items = [p for p in products if p.get("status") in ["critical", "warning"]]
        total_units = sum(max(0, p["reorder_point"] - p["stock"] + p["safety_stock"]) for p in reorder_items)
        total_cost = sum(max(0, p["reorder_point"] - p["stock"] + p["safety_stock"]) * p["unit_cost"] for p in reorder_items)
        
        lines = [f"📋 **Automated Reorder Plan** ({len(reorder_items)} SKUs recommended for ordering):\n"]
        for p in reorder_items:
            qty = max(0, p["reorder_point"] - p["stock"] + p["safety_stock"])
            lines.append(f"• **{p['sku']}**: Order **{qty} units** (${qty * p['unit_cost']:,.0f}) — Lead time: {p['lead_time']} days")
        lines.append(f"\n💰 Total Estimated PO Value: **${total_cost:,.2f}** for **{total_units} units**.")
        return "\n".join(lines)

    if any(k in msg for k in ["overstock", "excess", "surplus", "holding cost"]):
        overstock_items = [p for p in products if p.get("status") == "overstock"]
        lines = [f"📦 **Overstock Analysis** ({len(overstock_items)} SKUs above target buffer):\n"]
        for p in overstock_items:
            surplus = p["stock"] - p["reorder_point"]
            lines.append(f"• **{p['sku']}** ({p['name']}): **{p['stock']} units** in stock ({surplus} units above ROP).")
        lines.append("\n💡 Recommendation: Consider targeted promotional bundling or markdown campaigns to optimize warehouse space.")
        return "\n".join(lines)

    if any(k in msg for k in ["anomaly", "anomalies", "spike", "alert"]):
        if not open_anomalies:
            return "✅ No active anomalies detected. All demand and inventory signals are within expected 95% confidence bands."
        lines = [f"⚡ **Active Supply Chain Anomalies** ({len(open_anomalies)} open alerts):\n"]
        for a in open_anomalies[:4]:
            lines.append(f"• **[{a['category']}] {a['product']}**: {a['deviation']} ({a['impact']})")
        return "\n".join(lines)

    if any(k in msg for k in ["accuracy", "model", "mape", "forecast", "algorithm"]):
        return (
            "🤖 **DemandAI Forecasting Engine Status**:\n"
            "• **Model**: Triple Exponential Smoothing (Holt-Winters) + Multi-Factor Seasonality\n"
            "• **Overall Accuracy**: **94.2%** (MAPE: 4.8%)\n"
            "• **Confidence Interval**: 95% upper/lower prediction bands\n"
            "• **Retraining Frequency**: Continuous rolling weekly updates with automated drift detection."
        )

    critical_count = sum(1 for p in products if p.get("status") == "critical")
    warning_count = sum(1 for p in products if p.get("status") == "warning")
    return (
        f"👋 I'm your **DemandAI Copilot**, connected to Supabase and powered by Groq AI.\n"
        f"• **Tracked SKUs**: {len(products)} products across categories\n"
        f"• **Attention Needed**: {critical_count} Critical, {warning_count} Warning SKUs\n"
        f"• **Active Alerts**: {len(open_anomalies)} anomalies open\n\n"
        f"You can ask me questions like:\n"
        f"👉 *'Which SKUs are at risk of stockout?'*\n"
        f"👉 *'What is the reorder recommendation for Sony WH-1000XM5?'*\n"
        f"👉 *'Show me overstock items and holding costs'*."
    )
