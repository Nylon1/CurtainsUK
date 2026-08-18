"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfessionalProject, requireProfessionalUser } from "@/lib/professional-platform/server";

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
  const valueNumber = Number(text);
  return Number.isFinite(valueNumber) ? valueNumber : null;
}

function memberRole(value: string) {
  const allowed = new Set([
    "architect",
    "interior_designer",
    "developer",
    "housebuilder",
    "contractor",
    "fit_out",
    "consultant",
    "collaborator",
    "viewer",
  ]);
  return allowed.has(value) ? value : "collaborator";
}

function provenance(value: string) {
  const allowed = new Set([
    "confirmed_project_information",
    "design_team_preference",
    "apex_preliminary_recommendation",
    "unresolved",
  ]);
  return allowed.has(value) ? value : "unresolved";
}

export async function createProjectInvitation(projectId: string, formData: FormData) {
  const { supabase, user } = await requireProfessionalUser();
  const email = clean(formData.get("email")).toLowerCase();
  const role = memberRole(clean(formData.get("role")));
  const organisation = nullable(formData.get("organisation"));

  if (!email || !email.includes("@")) throw new Error("VALID_EMAIL_REQUIRED");

  const { data: project, error: projectError } = await supabase
    .from("professional_projects")
    .select("id,created_by")
    .eq("id", projectId)
    .single();

  if (projectError || !project) throw new Error("PROJECT_NOT_FOUND");
  if (project.created_by !== user.id) throw new Error("OWNER_REQUIRED");

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: invitation, error: invitationError } = await supabase
    .from("professional_project_invitations")
    .insert({
      project_id: projectId,
      email,
      role,
      organisation,
      status: "pending",
      token_hash: tokenHash,
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (invitationError || !invitation) throw invitationError || new Error("INVITATION_CREATE_FAILED");

  const next = `/professionals/workspace/invitations/${token}`;
  const emailRedirectTo = `https://www.apexcurtains.com/auth/callback?next=${encodeURIComponent(next)}`;

  const { error: emailError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo,
    },
  });

  if (emailError) {
    await supabase
      .from("professional_project_invitations")
      .update({ status: "revoked" })
      .eq("id", invitation.id);
    throw emailError;
  }

  revalidatePath(`/professionals/workspace/live/projects/${projectId}/members`);
  redirect(`/professionals/workspace/live/projects/${projectId}/members?sent=access&email=${encodeURIComponent(email)}`);
}

export async function acceptProjectInvitation(token: string) {
  const { supabase, user } = await requireProfessionalUser();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: invitation, error } = await supabase
    .from("professional_project_invitations")
    .select("id,project_id,email,role,organisation,status,expires_at")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !invitation) throw new Error("INVITATION_NOT_AVAILABLE");
  if ((user.email || "").toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("INVITATION_EMAIL_MISMATCH");
  }

  const { error: memberError } = await supabase.from("professional_project_members").upsert({
    project_id: invitation.project_id,
    user_id: user.id,
    role: invitation.role,
    organisation: invitation.organisation,
  }, { onConflict: "project_id,user_id" });

  if (memberError) throw memberError;

  const { error: invitationUpdateError } = await supabase
    .from("professional_project_invitations")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  if (invitationUpdateError) throw invitationUpdateError;

  redirect(`/professionals/workspace/live/projects/${invitation.project_id}`);
}

export async function updateProjectAperture(projectId: string, apertureId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();

  const { error } = await supabase
    .from("professional_project_apertures")
    .update({
      reference: clean(formData.get("reference")),
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
      provenance: provenance(clean(formData.get("provenance"))),
      notes: nullable(formData.get("notes")),
    })
    .eq("id", apertureId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  redirect(`/professionals/workspace/live/projects/${projectId}/apertures/${apertureId}`);
}

export async function completeProjectAction(projectId: string, actionId: string) {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_project_actions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", actionId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
}

export async function closeProjectRisk(projectId: string, riskId: string, status: "resolved" | "accepted") {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_project_risks")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", riskId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
}

export async function createControlledProjectExport(projectId: string, exportType = "preliminary_specification") {
  const { supabase, user } = await requireProfessionalUser();
  const data = await getProfessionalProject(projectId);

  const { data: existing, error: versionError } = await supabase
    .from("professional_project_exports")
    .select("version")
    .eq("project_id", projectId)
    .eq("export_type", exportType)
    .order("version", { ascending: false })
    .limit(1);

  if (versionError) throw versionError;
  const nextVersion = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;

  const snapshot = {
    generated_at: new Date().toISOString(),
    purpose: "Preliminary coordination only — not manufacture approval",
    project: data.project,
    apertures: data.apertures,
    documents: data.documents,
    specification_items: data.specificationItems,
    risks: data.risks,
    actions: data.actions,
  };

  const { error } = await supabase.from("professional_project_exports").insert({
    project_id: projectId,
    export_type: exportType,
    version: nextVersion,
    status: "preliminary",
    snapshot,
    generated_by: user.id,
  });

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/exports`);
  redirect(`/professionals/workspace/live/projects/${projectId}/exports`);
}
