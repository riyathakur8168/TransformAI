from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "OPERATOR"
    organization_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    created_by: str
    organization_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sources_count: Optional[int] = 0
    transformations_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Source Schemas ---
class SourceCreateText(BaseModel):
    project_id: str
    name: str
    text: str

class ContentAnalysisResponse(BaseModel):
    id: str
    source_id: str
    title: str
    topic: str
    summary: str
    structured_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class SourceResponse(BaseModel):
    id: str
    project_id: str
    name: str
    type: str
    file_size: int
    processing_status: str
    created_at: datetime
    analysis: Optional[ContentAnalysisResponse] = None

    class Config:
        from_attributes = True

# --- Transformation Schemas ---
class TransformationConfig(BaseModel):
    audience: str = "Executives"  # General Public, Government Officials, Executives, Technical Team, Security Team, Students, Custom
    tone: str = "Professional"    # Formal, Professional, Simple, Educational, Technical
    language: str = "English"     # English, Hindi
    detail_level: str = "Medium"  # Short, Medium, Detailed
    objective: str = "Inform"     # Inform, Educate, Awareness, Alert, Brief, Persuade
    style: str = "Professional"   # Professional, Technical, Educational, Concise, News-style

class TransformationCreate(BaseModel):
    project_id: str
    source_id: str
    output_types: List[str]  # executive_summary, linkedin, advisory, presentation
    configuration: TransformationConfig

class GeneratedContentResponse(BaseModel):
    id: str
    transformation_id: str
    type: str
    title: str
    content: str
    status: str  # DRAFT, UNDER_REVIEW, APPROVED
    current_version: int
    validation_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TransformationResponse(BaseModel):
    id: str
    project_id: str
    source_id: str
    configuration: Dict[str, Any]
    status: str  # PENDING, PROCESSING, GENERATING, VALIDATING, COMPLETED, FAILED
    created_by: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    outputs: List[GeneratedContentResponse] = []

    class Config:
        from_attributes = True

class ContentUpdate(BaseModel):
    content: str

class ApproveRequest(BaseModel):
    comments: Optional[str] = "Approved"

class VersionResponse(BaseModel):
    id: str
    generated_content_id: str
    version_number: int
    content: str
    changed_by: Optional[str] = None
    change_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class ExportRequest(BaseModel):
    format: str  # pdf, docx, pptx, txt

class ExportResponse(BaseModel):
    id: str
    generated_content_id: str
    format: str
    download_url: str
    status: str
    created_at: datetime

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    user_name: Optional[str] = "System"
    action: str
    resource_type: str
    resource_id: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
