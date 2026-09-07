from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Project, Source, Transformation, AuditLog
from app.schemas.schemas import ProjectCreate, ProjectResponse
from app.security.security import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Project)
    if current_user.role != "ADMIN" and current_user.organization_id:
        query = query.filter(Project.organization_id == current_user.organization_id)
    elif current_user.role != "ADMIN":
        query = query.filter(Project.created_by == current_user.id)

    projects = query.order_by(Project.created_at.desc()).all()
    
    result = []
    for p in projects:
        sources_cnt = db.query(Source).filter(Source.project_id == p.id).count()
        trans_cnt = db.query(Transformation).filter(Transformation.project_id == p.id).count()
        resp = ProjectResponse.model_validate(p)
        resp.sources_count = sources_cnt
        resp.transformations_count = trans_cnt
        result.append(resp)
    
    return result

@router.post("", response_model=ProjectResponse)
def create_project(proj_in: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_proj = Project(
        name=proj_in.name,
        description=proj_in.description,
        created_by=current_user.id,
        organization_id=current_user.organization_id
    )
    db.add(new_proj)
    db.commit()
    db.refresh(new_proj)

    # Audit
    db.add(AuditLog(
        user_id=current_user.id,
        action="CREATE_PROJECT",
        resource_type="PROJECT",
        resource_id=new_proj.id,
        metadata_json={"name": new_proj.name}
    ))
    db.commit()

    resp = ProjectResponse.model_validate(new_proj)
    resp.sources_count = 0
    resp.transformations_count = 0
    return resp

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    sources_cnt = db.query(Source).filter(Source.project_id == proj.id).count()
    trans_cnt = db.query(Transformation).filter(Transformation.project_id == proj.id).count()
    
    resp = ProjectResponse.model_validate(proj)
    resp.sources_count = sources_cnt
    resp.transformations_count = trans_cnt
    return resp

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(proj)
    db.commit()
    return {"message": "Project deleted successfully"}
