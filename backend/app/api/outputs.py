from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GeneratedContent, ContentVersion, Review, Transformation, Source, ContentAnalysis, AuditLog
from app.schemas.schemas import GeneratedContentResponse, ContentUpdate, ApproveRequest, VersionResponse
from app.security.security import get_current_user, User, RoleChecker
from app.ai.content_generator import generate_output_content
from app.ai.validator import validate_generated_content

router = APIRouter(prefix="/outputs", tags=["Generated Outputs"])

@router.get("/{output_id}", response_model=GeneratedContentResponse)
def get_output(output_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    output = db.query(GeneratedContent).filter(GeneratedContent.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    return output


@router.put("/{output_id}", response_model=GeneratedContentResponse)
async def update_output_content(
    output_id: str,
    update_in: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = db.query(GeneratedContent).filter(GeneratedContent.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    output.content = update_in.content
    output.current_version += 1
    
    # Re-run validation on updated content
    trans = db.query(Transformation).filter(Transformation.id == output.transformation_id).first()
    if trans:
        source = db.query(Source).filter(Source.id == trans.source_id).first()
        analysis = db.query(ContentAnalysis).filter(ContentAnalysis.source_id == source.id).first()
        structured_facts = analysis.structured_data if analysis else {}
        val_res = await validate_generated_content(update_in.content, output.type, structured_facts, source.raw_text if source else "")
        output.validation_data = val_res

    # Create new version entry
    version = ContentVersion(
        generated_content_id=output.id,
        version_number=output.current_version,
        content=update_in.content,
        changed_by=current_user.id,
        change_type="MANUAL_EDIT"
    )
    db.add(version)

    # Audit Log
    db.add(AuditLog(
        user_id=current_user.id,
        action="EDIT_OUTPUT",
        resource_type="GENERATED_CONTENT",
        resource_id=output.id,
        metadata_json={"version": output.current_version}
    ))
    db.commit()
    db.refresh(output)
    return output


@router.post("/{output_id}/regenerate", response_model=GeneratedContentResponse)
async def regenerate_output(
    output_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = db.query(GeneratedContent).filter(GeneratedContent.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    trans = db.query(Transformation).filter(Transformation.id == output.transformation_id).first()
    source = db.query(Source).filter(Source.id == trans.source_id).first()
    analysis = db.query(ContentAnalysis).filter(ContentAnalysis.source_id == source.id).first()
    structured_facts = analysis.structured_data if analysis else {}

    gen_res = await generate_output_content(output.type, structured_facts, source.raw_text, trans.configuration)
    val_res = await validate_generated_content(gen_res["content"], output.type, structured_facts, source.raw_text)

    output.content = gen_res["content"]
    output.current_version += 1
    output.validation_data = val_res

    version = ContentVersion(
        generated_content_id=output.id,
        version_number=output.current_version,
        content=gen_res["content"],
        changed_by=current_user.id,
        change_type="REGENERATION"
    )
    db.add(version)

    db.add(AuditLog(
        user_id=current_user.id,
        action="REGENERATE_OUTPUT",
        resource_type="GENERATED_CONTENT",
        resource_id=output.id,
        metadata_json={"version": output.current_version}
    ))
    db.commit()
    db.refresh(output)
    return output


@router.post("/{output_id}/approve", response_model=GeneratedContentResponse)
def approve_output(
    output_id: str,
    req: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "REVIEWER"]))
):
    output = db.query(GeneratedContent).filter(GeneratedContent.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    output.status = "APPROVED"
    
    review = Review(
        generated_content_id=output.id,
        reviewer_id=current_user.id,
        status="APPROVED",
        comments=req.comments
    )
    db.add(review)

    db.add(AuditLog(
        user_id=current_user.id,
        action="APPROVE_OUTPUT",
        resource_type="GENERATED_CONTENT",
        resource_id=output.id,
        metadata_json={"comments": req.comments}
    ))
    db.commit()
    db.refresh(output)
    return output


@router.get("/{output_id}/versions", response_model=List[VersionResponse])
def list_versions(output_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    versions = db.query(ContentVersion).filter(ContentVersion.generated_content_id == output_id).order_by(ContentVersion.version_number.desc()).all()
    return versions


@router.post("/{output_id}/restore/{version_number}", response_model=GeneratedContentResponse)
def restore_version(
    output_id: str,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = db.query(GeneratedContent).filter(GeneratedContent.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    target_ver = db.query(ContentVersion).filter(
        ContentVersion.generated_content_id == output_id,
        ContentVersion.version_number == version_number
    ).first()
    if not target_ver:
        raise HTTPException(status_code=404, detail="Version not found")

    output.content = target_ver.content
    output.current_version += 1

    new_ver = ContentVersion(
        generated_content_id=output.id,
        version_number=output.current_version,
        content=target_ver.content,
        changed_by=current_user.id,
        change_type=f"RESTORE_V{version_number}"
    )
    db.add(new_ver)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RESTORE_VERSION",
        resource_type="GENERATED_CONTENT",
        resource_id=output.id,
        metadata_json={"restored_from": version_number, "new_version": output.current_version}
    ))
    db.commit()
    db.refresh(output)
    return output
