export type Role = 'ADMIN' | 'OPERATOR' | 'REVIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  created_by: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  sources_count?: number;
  transformations_count?: number;
}

export interface StructuredFacts {
  title: string;
  topic: string;
  summary: string;
  key_facts: string[];
  entities: string[];
  dates: string[];
  statistics: string[];
  risks: string[];
  recommendations: string[];
}

export interface ContentAnalysis {
  id: string;
  source_id: string;
  title: string;
  topic: string;
  summary: string;
  structured_data: StructuredFacts;
  created_at: string;
}

export interface Source {
  id: string;
  project_id: string;
  name: string;
  type: string;
  raw_text?: string;
  file_size: number;
  processing_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  analysis?: ContentAnalysis;
}

export interface TransformationConfig {
  audience: string;
  tone: string;
  language: string;
  detail_level: string;
  objective: string;
  style: string;
}

export interface ValidationData {
  supported_claims: string[];
  unsupported_claims: string[];
  missing_facts: string[];
  warnings: string[];
  score: number;
}

export interface GeneratedContent {
  id: string;
  transformation_id: string;
  type: 'executive_summary' | 'linkedin' | 'advisory' | 'presentation';
  title: string;
  content: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED';
  current_version: number;
  validation_data?: ValidationData;
  created_at: string;
  updated_at: string;
}

export interface Transformation {
  id: string;
  project_id: string;
  source_id: string;
  configuration: TransformationConfig;
  status: 'PENDING' | 'PROCESSING' | 'GENERATING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
  created_by: string;
  created_at: string;
  completed_at?: string;
  outputs: GeneratedContent[];
}

export interface ContentVersion {
  id: string;
  generated_content_id: string;
  version_number: number;
  content: string;
  changed_by?: string;
  change_type: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}
