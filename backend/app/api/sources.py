import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Source, SourceChunk, ContentAnalysis, AuditLog, Project
from app.schemas.schemas import SourceCreateText, SourceResponse, ContentAnalysisResponse
from app.security.security import get_current_user, User
from app.document_processing.parser import extract_text_from_file, clean_text, chunk_text
from app.ai.fact_extractor import extract_structured_facts

router = APIRouter(prefix="/sources", tags=["Sources"])

@router.post("/text", response_model=SourceResponse)
async def create_text_source(source_in: SourceCreateText, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    proj = db.query(Project).filter(Project.id == source_in.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    cleaned = clean_text(source_in.text)
    new_source = Source(
        project_id=source_in.project_id,
        name=source_in.name,
        type="TEXT",
        raw_text=cleaned,
        file_size=len(cleaned.encode("utf-8")),
        processing_status="PROCESSING"
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)

    # Chunks
    pages = [{"page_number": 1, "content": cleaned}]
    chunks = chunk_text(cleaned, pages)
    for c in chunks:
        db.add(SourceChunk(
            source_id=new_source.id,
            chunk_index=c["chunk_index"],
            page_number=c["page_number"],
            content=c["content"]
        ))

    # Auto extract analysis
    facts_data = await extract_structured_facts(cleaned, source_in.name)
    analysis = ContentAnalysis(
        source_id=new_source.id,
        title=facts_data.get("title", source_in.name),
        topic=facts_data.get("topic", "General Analysis"),
        summary=facts_data.get("summary", cleaned[:300]),
        structured_data=facts_data
    )
    db.add(analysis)
    new_source.processing_status = "COMPLETED"

    # Audit Log
    db.add(AuditLog(
        user_id=current_user.id,
        action="UPLOAD_SOURCE",
        resource_type="SOURCE",
        resource_id=new_source.id,
        metadata_json={"type": "TEXT", "name": source_in.name}
    ))
    db.commit()
    db.refresh(new_source)

    return new_source


@router.post("/upload", response_model=SourceResponse)
async def upload_file_source(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not supported. Allowed: {settings.ALLOWED_EXTENSIONS}")

    storage_key = f"{uuid.uuid4()}{ext}"
    saved_path = os.path.join(settings.UPLOAD_DIR, storage_key)

    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB")

    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    extracted = extract_text_from_file(saved_path, ext.replace(".", "").upper())
    raw_text = extracted["raw_text"]

    new_source = Source(
        project_id=project_id,
        name=file.filename,
        type=ext.replace(".", "").upper(),
        storage_key=storage_key,
        raw_text=raw_text,
        file_size=len(file_bytes),
        processing_status="PROCESSING"
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)

    # Chunks
    for c in extracted["chunks"]:
        db.add(SourceChunk(
            source_id=new_source.id,
            chunk_index=c["chunk_index"],
            page_number=c.get("page_number", 1),
            section=c.get("section"),
            content=c["content"]
        ))

    # Auto Fact Extraction
    facts_data = await extract_structured_facts(raw_text, file.filename)
    analysis = ContentAnalysis(
        source_id=new_source.id,
        title=facts_data.get("title", file.filename),
        topic=facts_data.get("topic", "Document Analysis"),
        summary=facts_data.get("summary", raw_text[:300]),
        structured_data=facts_data
    )
    db.add(analysis)
    new_source.processing_status = "COMPLETED"

    db.add(AuditLog(
        user_id=current_user.id,
        action="UPLOAD_SOURCE",
        resource_type="SOURCE",
        resource_id=new_source.id,
        metadata_json={"type": ext.upper(), "filename": file.filename}
    ))
    db.commit()
    db.refresh(new_source)

    return new_source


@router.get("/{source_id}", response_model=SourceResponse)
def get_source(source_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.post("/{source_id}/analyze")
async def analyze_source(source_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    facts_data = await extract_structured_facts(source.raw_text, source.name)

    existing_analysis = db.query(ContentAnalysis).filter(ContentAnalysis.source_id == source.id).first()
    if existing_analysis:
        existing_analysis.title = facts_data.get("title", source.name)
        existing_analysis.topic = facts_data.get("topic", "Analysis")
        existing_analysis.summary = facts_data.get("summary", source.raw_text[:300])
        existing_analysis.structured_data = facts_data
    else:
        new_an = ContentAnalysis(
            source_id=source.id,
            title=facts_data.get("title", source.name),
            topic=facts_data.get("topic", "Analysis"),
            summary=facts_data.get("summary", source.raw_text[:300]),
            structured_data=facts_data
        )
        db.add(new_an)

    db.commit()
    return {"job_id": str(uuid.uuid4()), "status": "COMPLETED", "facts": facts_data}
