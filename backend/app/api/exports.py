from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GeneratedContent, Export, AuditLog
from app.schemas.schemas import ExportRequest
from app.security.security import get_current_user, User
from app.exports.generators import generate_export_file

router = APIRouter(prefix="/outputs", tags=["Exports"])

MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain; charset=utf-8"
}

@router.post("/{output_id}/export")
def export_output(
    output_id: str,
    req: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = db.query(GeneratedContent).filter(GeneratedContent.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    fmt = req.format.lower()
    if fmt not in MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{fmt}'. Supported: pdf, docx, pptx, txt")

    file_bytes = generate_export_file(output.title, output.content, output.type, fmt)

    # Save export log
    exp_log = Export(
        generated_content_id=output.id,
        format=fmt,
        status="COMPLETED"
    )
    db.add(exp_log)

    db.add(AuditLog(
        user_id=current_user.id,
        action="EXPORT_FILE",
        resource_type="GENERATED_CONTENT",
        resource_id=output.id,
        metadata_json={"format": fmt}
    ))
    db.commit()

    safe_title = "".join(c for c in output.title if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    filename = f"{safe_title}_{output.id[:8]}.{fmt}"

    return Response(
        content=file_bytes,
        media_type=MIME_TYPES[fmt],
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\""
        }
    )
