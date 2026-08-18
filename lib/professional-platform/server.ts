import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProfessionalProject, ProjectAperture, ProjectRisk, ProjectSpecItem } from "./types";

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
