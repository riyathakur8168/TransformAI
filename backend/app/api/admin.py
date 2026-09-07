from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Organization, Project, Source, Transformation, GeneratedContent, AuditLog
from app.schemas.schemas import UserResponse, AuditLogResponse
from app.security.security import RoleChecker, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["ADMIN"]))):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    if role not in ["ADMIN", "OPERATOR", "REVIEWER"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be ADMIN, OPERATOR, or REVIEWER")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    
    db.add(AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER_ROLE",
        resource_type="USER",
        resource_id=user.id,
        metadata_json={"new_role": role}
    ))
    db.commit()
    db.refresh(user)
    return user


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["ADMIN"]))):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    result = []
    for log in logs:
        user_name = log.user.name if log.user else "System"
        resp = AuditLogResponse.model_validate(log)
        resp.user_name = user_name
        result.append(resp)
    return result


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_users = db.query(User).count()
    total_projects = db.query(Project).count()
    total_sources = db.query(Source).count()
    total_transformations = db.query(Transformation).count()
    total_outputs = db.query(GeneratedContent).count()
    approved_outputs = db.query(GeneratedContent).filter(GeneratedContent.status == "APPROVED").count()

    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "total_sources": total_sources,
        "total_transformations": total_transformations,
        "total_outputs": total_outputs,
        "approved_outputs": approved_outputs
    }
