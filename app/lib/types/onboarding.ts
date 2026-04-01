export interface Organization {
  id: number;
  name: string;
  is_active: boolean;
  inserted_at: string;
  updated_at: string;
}

export interface OrganizationListResponse {
  success: boolean;
  data?: Organization[];
  error?: string;
  errors?: { field: string; message: string }[];
  metadata?: Record<string, unknown>;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  organization_id: number;
  inserted_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  success: boolean;
  data?: Project[];
  error?: string;
  errors?: { field: string; message: string }[];
  metadata?: Record<string, unknown>;
}

export interface UserProject {
  user_id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  inserted_at: string;
}

export interface UserProjectListResponse {
  success: boolean;
  data?: UserProject[];
  error?: string;
  errors?: { field: string; message: string }[];
  metadata?: Record<string, unknown>;
}

export interface UserProjectDeleteResponse {
  success: boolean;
  data?: { message: string };
  error?: string;
  errors?: { field: string; message: string }[];
  metadata?: Record<string, unknown>;
}

export interface OnboardRequest {
  organization_name: string;
  project_name: string;
  email: string;
  password: string;
  user_name: string;
  credentials?: Record<string, unknown>[];
}

export interface OnboardResponseData {
  organization_id: number;
  organization_name: string;
  project_id: number;
  project_name: string;
  user_id: number;
  user_email: string;
  api_key: string;
}

export interface OnboardResponse {
  success: boolean;
  data?: OnboardResponseData;
  error?: string;
  errors?: { field: string; message: string }[];
  metadata?: Record<string, unknown>;
}
