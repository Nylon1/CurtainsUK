"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

const presetData: Record<string, Record<string, unknown>> = {
  housebuilder_plot: {
    label: "Housebuilder repeated plot",
    project_stage: "technical_design",
    lead_role: "housebuilder",
    apertures: [
      { reference: "TYPE-A", window_type: "feature glazing", provenance: "unresolved" },
      { reference: "TYPE-B", window_type: "standard opening", provenance: "unresolved" },
    ],
    handover: [
      ["installation", "Installation complete against agreed scope"],
      ["operation", "Track and curtain operation checked"],
      ["snagging", "Snagging items recorded and responsibility assigned"],
      ["evidence", "Final project documents and revisions registered"],
      ["handover", "Handover record issued to project team"],
    ],
  },
  architect_feature_glazing: {
    label: "Architect feature glazing",
    project_stage: "developed_design",
    lead_role: "architect",
    apertures: [{ reference: "A-01", window_type: "apex / feature glazing", provenance: "unresolved" }],
    handover: [
      ["design", "Final aperture and fixing information confirmed"],
      ["evidence", "Latest approved drawings and specification references registered"],
      ["installation", "Installation complete and visual intent reviewed"],
      ["snagging", "Outstanding defects or adjustments recorded"],
      ["handover", "Controlled handover pack issued"],
    ],
  },
  fit_out_package: {
    label: "Contractor / fit-out package",
    project_stage: "fit_out",
    lead_role: "contractor",
    apertures: [{ reference: "FO-01", window_type: "project opening", provenance: "unresolved" }],
    handover: [
      ["site", "Access and work area released for installation"],
      ["installation", "Installation completed against current coordinated information"],
      ["operation", "Operation and clear-opening checks completed"],
      ["snagging", "Snagging and close-out actions recorded"],
      ["handover", "Handover pack and evidence register complete"],
    ],
  },
};

export async function savePresetTemplate(presetKey: string) {
  const { supabase, user } = await requireProfessionalUser();
  const data = presetData[presetKey];
  if (!data) throw new Error("UNKNOWN_TEMPLATE_PRESET");

  const { error } = await supabase.from("professional_project_templates").insert({
    name: String(data.label),
    template_type: presetKey,
    description: "Reusable Apex Professional project template. Review all seeded information before treating it as project-specific.",
    created_by: user.id,
    template_data: data,
  });
  if (error) throw error;
  revalidatePath("/professionals/workspace/live/templates");
}

export async function createProjectFromTemplate(templateId: string, formData: FormData) {
  const { supabase, user } = await requireProfessionalUser();
  const name = clean(formData.get("name"));
  if (!name) throw new Error("PROJECT_NAME_REQUIRED");

  const { data: template, error: templateError } = await supabase
    .from("professional_project_templates")
    .select("id,name,template_data")
    .eq("id", templateId)
    .eq("created_by", user.id)
    .single();
  if (templateError || !template) throw templateError || new Error("TEMPLATE_NOT_FOUND");

  const td = (template.template_data || {}) as {
    project_stage?: string;
    lead_role?: string;
    apertures?: Array<Record<string, unknown>>;
    handover?: Array<[string, string]>;
  };

  const reference = `APX-${Date.now().toString(36).toUpperCase()}`;
  const { data: project, error } = await supabase
    .from("professional_projects")
    .insert({
      reference,
      name,
      client_name: clean(formData.get("client_name")) || null,
      project_stage: td.project_stage || "concept",
      status: "information_review",
      location: clean(formData.get("location")) || null,
      lead_role: td.lead_role || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase.from("professional_project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "owner",
  });
  if (memberError) throw memberError;

  if (Array.isArray(td.apertures) && td.apertures.length) {
    const rows = td.apertures.map((item) => ({
      project_id: project.id,
      reference: String(item.reference || "OPENING"),
      window_type: item.window_type ? String(item.window_type) : null,
      status: "unresolved",
      provenance: "unresolved",
      notes: `Seeded from template: ${template.name}. Requires project-specific confirmation.`,
    }));
    const { error: apertureError } = await supabase.from("professional_project_apertures").insert(rows);
    if (apertureError) throw apertureError;
  }

  if (Array.isArray(td.handover) && td.handover.length) {
    const rows = td.handover.map(([category, title]) => ({ project_id: project.id, category, title, status: "open" }));
    const { error: handoverError } = await supabase.from("professional_project_handover_items").insert(rows);
    if (handoverError) throw handoverError;
  }

  redirect(`/professionals/workspace/live/projects/${project.id}`);
}

export async function initialiseHandoverChecklist(projectId: string) {
  const { supabase } = await requireProfessionalUser();
  const { count, error: countError } = await supabase
    .from("professional_project_handover_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countError) throw countError;
  if ((count || 0) > 0) return;

  const items = [
    ["installation", "Installation complete against agreed project scope"],
    ["operation", "Curtain and track operation checked"],
    ["evidence", "Final relevant drawings, schedules and survey evidence registered"],
    ["snagging", "Snagging items recorded with clear ownership"],
    ["close_out", "Outstanding RFIs, actions and accepted risks reviewed"],
    ["handover", "Controlled handover record prepared for project team"],
  ].map(([category, title]) => ({ project_id: projectId, category, title, status: "open" }));

  const { error } = await supabase.from("professional_project_handover_items").insert(items);
  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/handover`);
}

export async function setHandoverItemStatus(projectId: string, itemId: string, status: "completed" | "open" | "not_applicable") {
  const { supabase, user } = await requireProfessionalUser();
  const completed = status === "completed";
  const { error } = await supabase
    .from("professional_project_handover_items")
    .update({
      status,
      completed_by: completed ? user.id : null,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("project_id", projectId);
  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/handover`);
}

export async function supersedeProjectDocument(projectId: string, documentId: string) {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_project_documents")
    .update({
      evidence_status: "superseded",
      superseded_at: new Date().toISOString(),
      retention_status: "retain",
    })
    .eq("id", documentId)
    .eq("project_id", projectId);
  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/documents`);
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
}
