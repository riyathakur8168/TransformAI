from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Transformation, Source, GeneratedContent, ContentVersion, ContentAnalysis, AuditLog
from app.schemas.schemas import TransformationCreate, TransformationResponse
from app.security.security import get_current_user, User
from app.ai.content_generator import generate_output_content
from app.ai.validator import validate_generated_content

router = APIRouter(prefix="/transformations", tags=["Transformations"])

@router.post("", response_model=TransformationResponse)
async def create_transformation(
    trans_in: TransformationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source = db.query(Source).filter(Source.id == trans_in.source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source document not found")

    new_trans = Transformation(
        project_id=trans_in.project_id,
        source_id=trans_in.source_id,
        configuration=trans_in.configuration.model_dump(),
        status="PENDING",
        created_by=current_user.id
    )
    db.add(new_trans)
    db.commit()
    db.refresh(new_trans)

    # Immediately trigger synchronous/background generation pipeline
    await run_generation_pipeline(new_trans.id, trans_in.output_types, db, current_user.id)

    db.refresh(new_trans)
    return new_trans


@router.post("/{trans_id}/generate")
async def trigger_generation(
    trans_id: str,
    output_types: list[str] = ["executive_summary", "linkedin", "advisory", "presentation"],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trans = db.query(Transformation).filter(Transformation.id == trans_id).first()
    if not trans:
        raise HTTPException(status_code=404, detail="Transformation not found")

    trans.status = "GENERATING"
    db.commit()

    await run_generation_pipeline(trans_id, output_types, db, current_user.id)
    return {"job_id": trans_id, "status": "COMPLETED"}


@router.get("/{trans_id}", response_model=TransformationResponse)
def get_transformation(trans_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trans = db.query(Transformation).filter(Transformation.id == trans_id).first()
    if not trans:
        raise HTTPException(status_code=404, detail="Transformation not found")
    return trans


async def run_generation_pipeline(trans_id: str, output_types: list[str], db: Session, user_id: str):
    trans = db.query(Transformation).filter(Transformation.id == trans_id).first()
    if not trans:
        return

    trans.status = "PROCESSING"
    db.commit()

    source = db.query(Source).filter(Source.id == trans.source_id).first()
    analysis = db.query(ContentAnalysis).filter(ContentAnalysis.source_id == source.id).first()
    structured_facts = analysis.structured_data if (analysis and analysis.structured_data) else {
        "title": source.name,
        "topic": "General Document",
        "summary": source.raw_text[:300],
        "key_facts": [line.strip() for line in source.raw_text.splitlines() if len(line.strip()) > 30][:5]
    }

    config = trans.configuration
    trans.status = "GENERATING"
    db.commit()

    for out_type in output_types:
        gen_res = await generate_output_content(out_type, structured_facts, source.raw_text, config)
        
        # Run Source Grounding Validation Engine
        validation_res = await validate_generated_content(gen_res["content"], out_type, structured_facts, source.raw_text)

        # Save Generated Content
        gen_content = GeneratedContent(
            transformation_id=trans.id,
            type=out_type,
            title=gen_res["title"],
            content=gen_res["content"],
            status="DRAFT",
            current_version=1,
            validation_data=validation_res
        )
        db.add(gen_content)
        db.commit()
        db.refresh(gen_content)

        # Save Initial Version
        version = ContentVersion(
            generated_content_id=gen_content.id,
            version_number=1,
            content=gen_res["content"],
            changed_by=user_id,
            change_type="INITIAL_GENERATION"
        )
        db.add(version)

    trans.status = "COMPLETED"
    trans.completed_at = datetime.utcnow()

    # Audit Log
    db.add(AuditLog(
        user_id=user_id,
        action="GENERATE_TRANSFORMATION",
        resource_type="TRANSFORMATION",
        resource_id=trans.id,
        metadata_json={"output_types": output_types, "config": config}
    ))
    db.commit()
