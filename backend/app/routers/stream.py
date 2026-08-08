"""Server-Sent Events stream for real-time admin updates.

Polls PostgreSQL for applications newer than the client's last seen row id
and pushes a lightweight event for each. An EventSource in the admin shell
haars this, re-fetches list/dashboard data, and toasts "New application".
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..helpers import get_current_admin
from ..models import Admin, LoanApplication

router = APIRouter(prefix="/api/v1/stream", tags=["stream"])

POLL_INTERVAL = 1.5


def _fetch_new(since_id: int) -> list[tuple[int, str, dict]]:
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(LoanApplication.id, LoanApplication.reference_number, LoanApplication.status)
            .filter(LoanApplication.id > since_id)
            .order_by(LoanApplication.id.asc())
            .limit(50)
            .all()
        )
        return [
            (r[0], r[1], {"type": "application.created", "id": r[0], "reference_number": r[1], "status": r[2]})
            for r in rows
        ]
    finally:
        db.close()


@router.get("/events")
async def stream_events(request: Request, admin: Admin = Depends(get_current_admin)):
    async def event_stream():
        try:
            last_id = 0
            raw = request.headers.get("last-event-id", "0")
            if raw.isdigit():
                last_id = int(raw)
            yield "retry: 3000\n\n"
            while True:
                if await request.is_disconnected():
                    break
                changes = await asyncio.get_running_loop().run_in_executor(None, _fetch_new, last_id)
                for rid, ref, payload in changes:
                    yield f"id: {rid}\nevent: data\ndata: {json.dumps(payload, default=str)}\n\n"
                    if rid > last_id:
                        last_id = rid
                await asyncio.sleep(POLL_INTERVAL)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )