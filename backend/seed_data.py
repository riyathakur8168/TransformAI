import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import (
    Organization, User, Project, Source, SourceChunk,
    ContentAnalysis, Transformation, GeneratedContent, ContentVersion, Review, AuditLog
)
from app.security.security import get_password_hash
from app.ai.content_generator import generate_output_content
from app.ai.validator import validate_generated_content
import asyncio

async def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing if any
    db.query(AuditLog).delete()
    db.query(Review).delete()
    db.query(ContentVersion).delete()
    db.query(GeneratedContent).delete()
    db.query(Transformation).delete()
    db.query(ContentAnalysis).delete()
    db.query(SourceChunk).delete()
    db.query(Source).delete()
    db.query(Project).delete()
    db.query(User).delete()
    db.query(Organization).delete()
    db.commit()

    print("[Seed] Creating Organization...")
    org = Organization(name="TransformAI Enterprise Labs")
    db.add(org)
    db.commit()
    db.refresh(org)

    print("[Seed] Creating Users...")
    admin = User(
        name="Admin User",
        email="admin@transformai.com",
        password_hash=get_password_hash("admin123"),
        role="ADMIN",
        organization_id=org.id
    )
    reviewer = User(
        name="Elena Vance (Reviewer)",
        email="reviewer@transformai.com",
        password_hash=get_password_hash("reviewer123"),
        role="REVIEWER",
        organization_id=org.id
    )
    operator = User(
        name="Riya Sharma (Operator)",
        email="operator@transformai.com",
        password_hash=get_password_hash("operator123"),
        role="OPERATOR",
        organization_id=org.id
    )
    db.add_all([admin, reviewer, operator])
    db.commit()

    print("[Seed] Creating Sample Project...")
    project = Project(
        name="Enterprise Cybersecurity & Zero Trust Assessment 2026",
        description="Comprehensive audit on cloud infrastructure security, API threat vectors, and recommended zero-trust protocols.",
        created_by=operator.id,
        organization_id=org.id
    )
    db.add(project)
    db.commit()

    print("[Seed] Creating Source Document...")
    sample_text = """
EXECUTIVE CYBERSECURITY AUDIT REPORT 2026
Prepared by: Global Security Operations Center (GSOC)
Date: August 14, 2026

1. EXECUTIVE OVERVIEW
During Q2 2026, the Global Security Operations Center conducted an exhaustive vulnerability and threat assessment across all enterprise multi-cloud infrastructure environments. The audit revealed a 42% increase in automated API credential stuffing attempts targeting financial endpoints, resulting in 18 critical severity alerts that required immediate remediation. Overall system resilience improved by 28% following the deployment of hardware-backed identity access keys.

2. KEY AUDIT FINDINGS & METRICS
- Total Threat Incidents Detected: 1,420 automated attacks logged between May 1 and July 31, 2026.
- Cloud Infrastructure Compliance: 94.2% compliance achieved under ISO 27001 and SOC 2 Type II guidelines.
- Unpatched Vulnerabilities: Identified 3 high-severity zero-day buffer overflow flaws in legacy identity microservices (CVE-2026-8891).
- Mean Time to Respond (MTTR): Reduced from 48 minutes in 2025 down to 12 minutes in Q2 2026 due to AI-driven automated triage pipelines.

3. RISK ASSESSMENT & VULNERABILITY VECTORS
- Risk 1: Legacy identity gateways lack multi-factor cryptographic hardware enforcement, exposing administrative accounts to targeted spear-phishing.
- Risk 2: Shadow APIs operating without centralized OpenAPI schema validation pose data leakage risks across external developer webhooks.
- Risk 3: Rate limiting on public REST endpoints currently allows bursts of up to 500 requests per second per IP, enabling brute force dictionary attacks.

4. STRATEGIC RECOMMENDATIONS
- Recommendation 1: Mandate FIDO2 hardware security keys for all engineering and administrative privilege tiers by September 30, 2026.
- Recommendation 2: Implement automated API Gateway rate limiting enforcing a maximum threshold of 50 requests per minute per authenticated token.
- Recommendation 3: Transition legacy monolithic microservices to containerized zero-trust network architectures with mutual TLS (mTLS) by Q4 2026.
- Recommendation 4: Conduct bi-weekly penetration testing and continuous vulnerability scanning across all staging environments.
"""

    source = Source(
        project_id=project.id,
        name="Cybersecurity_Threat_Report_Q2_2026.txt",
        type="TXT",
        raw_text=sample_text,
        file_size=len(sample_text.encode("utf-8")),
        processing_status="COMPLETED"
    )
    db.add(source)
    db.commit()

    # Fact Analysis
    structured_facts = {
        "title": "Executive Cybersecurity Audit Report 2026",
        "topic": "Cloud Security & Threat Assessment",
        "summary": "Global Security Operations Center audit revealing 42% increase in API attacks, 94.2% compliance score, and MTTR reduction to 12 minutes.",
        "key_facts": [
            "Total Threat Incidents Detected: 1,420 automated attacks logged between May 1 and July 31, 2026.",
            "Cloud Infrastructure Compliance reached 94.2% under ISO 27001 and SOC 2 Type II.",
            "Mean Time to Respond (MTTR) reduced from 48 minutes in 2025 to 12 minutes in Q2 2026.",
            "Identified 3 high-severity zero-day buffer overflow flaws in legacy identity microservices (CVE-2026-8891)."
        ],
        "entities": ["Global Security Operations Center", "GSOC", "ISO 27001", "SOC 2 Type II", "CVE-2026-8891", "FIDO2", "API Gateway"],
        "dates": ["August 14, 2026", "May 1, 2026", "July 31, 2026", "September 30, 2026", "Q4 2026"],
        "statistics": ["42% increase in API attacks", "18 critical alerts", "28% resilience improvement", "94.2% compliance", "12 minutes MTTR"],
        "risks": [
            "Legacy identity gateways lack multi-factor cryptographic hardware enforcement.",
            "Shadow APIs operating without centralized validation pose data leakage risks.",
            "Rate limiting on public REST endpoints allows bursts up to 500 requests per second."
        ],
        "recommendations": [
            "Mandate FIDO2 hardware security keys for all administrative tiers by September 30, 2026.",
            "Enforce API Gateway rate limits of 50 requests per minute per authenticated token.",
            "Transition monolithic microservices to zero-trust containerized architecture with mTLS by Q4 2026."
        ]
    }

    analysis = ContentAnalysis(
        source_id=source.id,
        title=structured_facts["title"],
        topic=structured_facts["topic"],
        summary=structured_facts["summary"],
        structured_data=structured_facts
    )
    db.add(analysis)
    db.commit()

    print("[Seed] Generating Initial Outputs & Validation...")
    config = {
        "audience": "Executives",
        "tone": "Professional",
        "language": "English",
        "detail_level": "Medium",
        "objective": "Inform",
        "style": "Professional"
    }

    trans = Transformation(
        project_id=project.id,
        source_id=source.id,
        configuration=config,
        status="COMPLETED",
        created_by=operator.id,
        completed_at=datetime.utcnow()
    )
    db.add(trans)
    db.commit()

    output_types = ["executive_summary", "linkedin", "advisory", "presentation"]
    for out_type in output_types:
        gen_res = await generate_output_content(out_type, structured_facts, sample_text, config)
        val_res = await validate_generated_content(gen_res["content"], out_type, structured_facts, sample_text)

        status_str = "APPROVED" if out_type in ["executive_summary", "linkedin"] else "UNDER_REVIEW"
        
        gen_content = GeneratedContent(
            transformation_id=trans.id,
            type=out_type,
            title=gen_res["title"],
            content=gen_res["content"],
            status=status_str,
            current_version=1,
            validation_data=val_res
        )
        db.add(gen_content)
        db.commit()
        db.refresh(gen_content)

        db.add(ContentVersion(
            generated_content_id=gen_content.id,
            version_number=1,
            content=gen_res["content"],
            changed_by=operator.id,
            change_type="INITIAL_GENERATION"
        ))

        if status_str == "APPROVED":
            db.add(Review(
                generated_content_id=gen_content.id,
                reviewer_id=reviewer.id,
                status="APPROVED",
                comments="Verified against source document. Excellent grounding and tone."
            ))

    # Audit Logs
    db.add(AuditLog(
        user_id=operator.id,
        action="SEED_DEMO_DATA",
        resource_type="SYSTEM",
        metadata_json={"status": "INITIALIZED"}
    ))
    db.commit()

    print("[Seed] Database Seed Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
