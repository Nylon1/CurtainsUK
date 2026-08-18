import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ApertureRevision,
  ProfessionalProject,
  ProjectAperture,
  ProjectExport,
  ProjectInvitation,
  ProjectMember,
  ProjectRisk,
  ProjectSpecItem,
} from "./types";

export async function requireProfessionalUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return { supabase, user };
}

export async function listProfessionalProjects(): Promise<ProfessionalProject[]> {
  const { supabase } = await requireProfessionalUser();
  const { data, error } = await supabase
    .from("professional_projects")
    .select("id,reference,name,client_name,project_stage,status,location,lead_role,created_by,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProfessionalProject[];
}

export async function getProfessionalProject(projectId: string) {
  const { supabase } = await requireProfessionalUser();

  const [projectResult, aperturesResult, specsResult, risksResult, actionsResult, documentsResult] = await Promise.all([
    supabase.from("professional_projects").select("*").eq("id", projectId).single(),
    supabase.from("professional_project_apertures").select("*").eq("project_id", projectId).order("reference"),
    supabase.from("professional_project_spec_items").select("*").eq("project_id", projectId).order("category"),
    supabase.from("professional_project_risks").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("professional_project_actions").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("professional_project_documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (aperturesResult.error) throw aperturesResult.error;
  if (specsResult.error) throw specsResult.error;
  if (risksResult.error) throw risksResult.error;
  if (actionsResult.error) throw actionsResult.error;
  if (documentsResult.error) throw documentsResult.error;

  return {
    project: projectResult.data as ProfessionalProject,
    apertures: (aperturesResult.data ?? []) as ProjectAperture[],
    specificationItems: (specsResult.data ?? []) as ProjectSpecItem[],
    risks: (risksResult.data ?? []) as ProjectRisk[],
    actions: actionsResult.data ?? [],
    documents: documentsResult.data ?? [],
  };
}

export async function getProjectCollaboration(projectId: string) {
  const { supabase, user } = await requireProfessionalUser();
  const [projectResult, membersResult, invitationsResult, exportsResult] = await Promise.all([
    supabase.from("professional_projects").select("id,reference,name,created_by").eq("id", projectId).single(),
    supabase.from("professional_project_members").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("professional_project_invitations").select("id,project_id,email,role,organisation,status,invited_by,accepted_by,expires_at,created_at,accepted_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("professional_project_exports").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (membersResult.error) throw membersResult.error;
  if (invitationsResult.error) throw invitationsResult.error;
  if (exportsResult.error) throw exportsResult.error;

  return {
    project: projectResult.data,
    members: (membersResult.data ?? []) as ProjectMember[],
    invitations: (invitationsResult.data ?? []) as ProjectInvitation[],
    exports: (exportsResult.data ?? []) as ProjectExport[],
    isOwner: projectResult.data.created_by === user.id,
  };
}

export async function getApertureRevisions(projectId: string, apertureId: string) {
  const { supabase } = await requireProfessionalUser();
  const { data, error } = await supabase
    .from("professional_project_aperture_revisions")
    .select("*")
    .eq("project_id", projectId)
    .eq("aperture_id", apertureId)
    .order("revision_no", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ApertureRevision[];
}

export async function getPendingInvitationByHash(tokenHash: string) {
  const { supabase, user } = await requireProfessionalUser();
  const { data, error } = await supabase
    .from("professional_project_invitations")
    .select("id,project_id,email,role,organisation,status,invited_by,accepted_by,expires_at,created_at,accepted_at,professional_projects(reference,name)")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error) throw error;
  return { invitation: data, user };
}

export async function getProjectExport(projectId: string, exportId: string) {
  const { supabase } = await requireProfessionalUser();
  const { data, error } = await supabase
    .from("professional_project_exports")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", exportId)
    .single();

  if (error) throw error;
  return data as ProjectExport;
}
