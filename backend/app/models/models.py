import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="OPERATOR")  # ADMIN, OPERATOR, REVIEWER
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    projects = relationship("Project", back_populates="creator")
    transformations = relationship("Transformation", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, ARCHIVED, COMPLETED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="projects")
    creator = relationship("User", back_populates="projects")
    sources = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    transformations = relationship("Transformation", back_populates="project", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # PDF, DOCX, TXT, PPTX, TEXT
    storage_key = Column(String, nullable=True)
    raw_text = Column(Text, nullable=False)
    file_size = Column(Integer, default=0)
    processing_status = Column(String, default="COMPLETED")  # PENDING, PROCESSING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="sources")
    chunks = relationship("SourceChunk", back_populates="source", cascade="all, delete-orphan")
    analysis = relationship("ContentAnalysis", back_populates="source", uselist=False, cascade="all, delete-orphan")
    transformations = relationship("Transformation", back_populates="source", cascade="all, delete-orphan")


class SourceChunk(Base):
    __tablename__ = "source_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="chunks")


class ContentAnalysis(Base):
    __tablename__ = "content_analysis"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False, unique=True)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    structured_data = Column(JSON, nullable=False)  # key_facts, entities, dates, stats, risks, recs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("Source", back_populates="analysis")


class Transformation(Base):
    __tablename__ = "transformations"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False)
    configuration = Column(JSON, nullable=False)  # audience, tone, language, detail, objective, style
    status = Column(String, default="PENDING")  # PENDING, PROCESSING, GENERATING, VALIDATING, COMPLETED, FAILED
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="transformations")
    source = relationship("Source", back_populates="transformations")
    creator = relationship("User", back_populates="transformations")
    generated_contents = relationship("GeneratedContent", back_populates="transformation", cascade="all, delete-orphan")


class GeneratedContent(Base):
    __tablename__ = "generated_contents"

    id = Column(String, primary_key=True, default=generate_uuid)
    transformation_id = Column(String, ForeignKey("transformations.id"), nullable=False)
    type = Column(String, nullable=False)  # executive_summary, linkedin, advisory, presentation
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # JSON or Markdown string
    status = Column(String, default="DRAFT")  # DRAFT, UNDER_REVIEW, APPROVED
    current_version = Column(Integer, default=1)
    validation_data = Column(JSON, nullable=True)  # claims, score, warnings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transformation = relationship("Transformation", back_populates="generated_contents")
    versions = relationship("ContentVersion", back_populates="generated_content", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="generated_content", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="generated_content", cascade="all, delete-orphan")


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    generated_content_id = Column(String, ForeignKey("generated_contents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    changed_by = Column(String, ForeignKey("users.id"), nullable=True)
    change_type = Column(String, default="EDIT")  # GENERATION, EDIT, REGENERATION, RESTORE
    created_at = Column(DateTime, default=datetime.utcnow)

    generated_content = relationship("GeneratedContent", back_populates="versions")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    generated_content_id = Column(String, ForeignKey("generated_contents.id"), nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False)  # APPROVED, REJECTED, CHANGES_REQUESTED
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    generated_content = relationship("GeneratedContent", back_populates="reviews")


class Export(Base):
    __tablename__ = "exports"

    id = Column(String, primary_key=True, default=generate_uuid)
    generated_content_id = Column(String, ForeignKey("generated_contents.id"), nullable=False)
    format = Column(String, nullable=False)  # pdf, docx, pptx, txt
    storage_key = Column(String, nullable=True)
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime, default=datetime.utcnow)

    generated_content = relationship("GeneratedContent", back_populates="exports")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # LOGIN, UPLOAD_SOURCE, GENERATE, EDIT, APPROVE, EXPORT
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
