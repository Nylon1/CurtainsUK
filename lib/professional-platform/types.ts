export type ProjectStage =
  | "concept"
  | "developed_design"
  | "technical_design"
  | "tender"
  | "construction"
  | "fit_out"
  | "handover";

export type ProjectStatus =
  | "information_review"
  | "preliminary_specification"
  | "design_coordination"
  | "survey_required"
  | "approved_for_manufacture"
  | "installation_planning"
  | "installation"
  | "snagging"
  | "handover"
  | "closed";

export type Provenance =
  | "confirmed_project_information"
  | "design_team_preference"
  | "apex_preliminary_recommendation"
  | "unresolved";

export type ItemStatus = "unresolved" | "information_received" | "preliminary" | "confirmed" | "superseded";

export type ProfessionalProject = {
  id: string;
  reference: string;
  name: string;
  client_name: string | null;
  project_stage: ProjectStage;
  status: ProjectStatus;
  location: string | null;
  lead_role: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectAperture = {
  id: string;
  project_id: string;
  reference: string;
  room: string | null;
  window_type: string | null;
  width_mm: number | null;
  left_height_mm: number | null;
  right_height_mm: number | null;
  peak_height_mm: number | null;
  track_route: string | null;
  fixing_position: string | null;
  fixing_substrate: string | null;
  operation: string | null;
  stack_back_requirement: string | null;
  clear_opening_requirement: string | null;
  status: ItemStatus;
  provenance: Provenance;
  notes: string | null;
};

export type ProjectSpecItem = {
  id: string;
  project_id: string;
  aperture_id: string | null;
  category: string;
  item_key: string;
  value_text: string | null;
  status: "unresolved" | "preliminary" | "confirmed" | "superseded";
  provenance: Provenance;
  source_document_id: string | null;
  notes: string | null;
};

export type ProjectRisk = {
  id: string;
  project_id: string;
  aperture_id: string | null;
  risk_type: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "monitoring" | "resolved" | "accepted";
};

export type ProjectMemberRole =
  | "owner"
  | "architect"
  | "interior_designer"
  | "developer"
  | "housebuilder"
  | "contractor"
  | "fit_out"
  | "consultant"
  | "collaborator"
  | "viewer";

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  organisation: string | null;
  created_at: string;
};

export type ProjectInvitation = {
  id: string;
  project_id: string;
  email: string;
  role: ProjectMemberRole;
  organisation: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by: string;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
};

export type ApertureRevision = {
  id: string;
  project_id: string;
  aperture_id: string;
  revision_no: number;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  change_note: string | null;
  created_at: string;
};

export type ProjectExport = {
  id: string;
  project_id: string;
  export_type: "preliminary_specification" | "coordination_brief" | "aperture_schedule" | "handover_record";
  version: number;
  status: "preliminary" | "issued" | "superseded";
  snapshot: Record<string, unknown>;
  generated_by: string;
  created_at: string;
  issued_at: string | null;
};
