"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text || null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function stage(value: string) {
  const allowed = new Set(["concept","developed_design","technical_design","tender","construction","fit_out","handover"]);
  return allowed.has(value) ? value : "concept";
}

function provenance(value: string) {
  const allowed = new Set(["confirmed_project_information","design_team_preference","apex_preliminary_recommendation","unresolved"]);
  return allowed.has(value) ? value : "unresolved";
}

export async function createProfessionalProject(formData: FormData) {
  const { supabase, user } = await requireProfessionalUser();

  const name = clean(formData.get("name"));
  if (!name) throw new Error("PROJECT_NAME_REQUIRED");

  const reference = `APX-${Date.now().toString(36).toUpperCase()}`;
  const { data: project, error } = await supabase
    .from("professional_projects")
    .insert({
      reference,
      name,
      client_name: clean(formData.get("client_name")) || null,
      project_stage: stage(clean(formData.get("project_stage"))),
      status: "information_review",
      location: clean(formData.get("location")) || null,
      lead_role: clean(formData.get("lead_role")) || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase.from("professional_project_members").upsert(
    {
      project_id: project.id,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "project_id,user_id" },
  );

  if (memberError) throw memberError;
  redirect(`/professionals/workspace/live/projects/${project.id}`);
}

export async function createProjectAperture(projectId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const reference = clean(formData.get("reference"));
  if (!reference) throw new Error("APERTURE_REFERENCE_REQUIRED");

  const { error } = await supabase.from("professional_project_apertures").insert({
    project_id: projectId,
    reference,
    room: nullable(formData.get("room")),
    window_type: nullable(formData.get("window_type")),
    width_mm: numberOrNull(formData.get("width_mm")),
    left_height_mm: numberOrNull(formData.get("left_height_mm")),
    right_height_mm: numberOrNull(formData.get("right_height_mm")),
    peak_height_mm: numberOrNull(formData.get("peak_height_mm")),
    track_route: nullable(formData.get("track_route")),
    fixing_position: nullable(formData.get("fixing_position")),
    fixing_substrate: nullable(formData.get("fixing_substrate")),
    operation: nullable(formData.get("operation")),
    stack_back_requirement: nullable(formData.get("stack_back_requirement")),
    clear_opening_requirement: nullable(formData.get("clear_opening_requirement")),
    status: "information_received",
    provenance: provenance(clean(formData.get("provenance"))),
    notes: nullable(formData.get("notes")),
  });

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  redirect(`/professionals/workspace/live/projects/${projectId}`);
}

export async function registerProjectDocument(projectId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const title = clean(formData.get("title"));
  if (!title) throw new Error("DOCUMENT_TITLE_REQUIRED");

  const { error } = await supabase.from("professional_project_documents").insert({
    project_id: projectId,
    aperture_id: nullable(formData.get("aperture_id")),
    document_type: clean(formData.get("document_type")) || "other",
    title,
    revision: nullable(formData.get("revision")),
    source_url: nullable(formData.get("source_url")),
    evidence_status: clean(formData.get("evidence_status")) || "for_review",
    provenance: provenance(clean(formData.get("provenance"))),
    issued_at: nullable(formData.get("issued_at")),
  });

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  redirect(`/professionals/workspace/live/projects/${projectId}`);
}

export async function createProjectAction(projectId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const title = clean(formData.get("title"));
  if (!title) throw new Error("ACTION_TITLE_REQUIRED");

  const { error } = await supabase.from("professional_project_actions").insert({
    project_id: projectId,
    aperture_id: nullable(formData.get("aperture_id")),
    action_type: clean(formData.get("action_type")) || "action",
    title,
    description: nullable(formData.get("description")),
    due_at: nullable(formData.get("due_at")),
    status: "open",
  });

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  redirect(`/professionals/workspace/live/projects/${projectId}`);
}
