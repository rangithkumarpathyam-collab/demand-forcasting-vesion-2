from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from typing import List, Dict, Any
from datetime import datetime
from backend.database import get_db
from backend.models import ReportGenerateRequest

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("")
def list_reports() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, type, last_run, format, size, status FROM reports ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/generate")
def generate_report(payload: ReportGenerateRequest) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()

    report_id = f"RPT-{(int(datetime.now().timestamp()) % 10000):03d}"
    now_str = datetime.now().strftime("%b %d, %Y")
    size_str = "1.2 MB" if payload.format == "PDF" else ("450 KB" if payload.format == "XLSX" else "120 KB")

    cursor.execute("""
        INSERT INTO reports (id, name, type, last_run, format, size, status, file_content)
        VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)
    """, (report_id, payload.name, payload.type or 'On-Demand', now_str, payload.format, size_str, f"Sample report content for {payload.name} generated at {now_str}"))

    conn.commit()
    conn.close()

    return {
        "id": report_id,
        "name": payload.name,
        "type": payload.type or 'On-Demand',
        "last_run": now_str,
        "format": payload.format,
        "size": size_str,
        "status": "ready"
    }

@router.get("/{report_id}/download")
def download_report(report_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    
    content = f"DemandAI Report: {r['name']}\nFormat: {r['format']}\nGenerated: {r['last_run']}\nStatus: {r['status']}\n\nSummary:\nAll operational metrics validated."
    return PlainTextResponse(content, media_type="text/plain", headers={"Content-Disposition": f"attachment; filename={report_id}.txt"})
