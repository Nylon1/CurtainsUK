"use server";

import { revalidatePath } from "next/cache";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: FormDataEntryValue | null) {
  const cleaned = clean(value);
  return cleaned || null;
}

function positiveIntegerOrNull(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function markupType(value: string) {
  const allowed = new Set(["note", "rfi", "risk", "track_route", "fixing", "dimension", "coordination"]);
  return allowed.has(value) ? value : "note";
}

function approvalType(value: string) {
  const allowed = new Set(["design", "track", "fabric", "lining", "heading", "fixing", "sample", "other"]);
  return allowed.has(value) ? value : "design";
}

export async function createDrawingMarkup(projectId: string, formData: FormData) {
  const { supabase, user } = await requireProfessionalUser();
  const documentId = clean(formData.get("document_id"));
  const title = clean(formData.get("title"));
  if (!documentId || !title) throw new Error("DOCUMENT_AND_TITLE_REQUIRED");

  const { error } = await supabase.from("professional_project_markups").insert({
    project_id: projectId,
    document_id: documentId,
    aperture_id: nullable(formData.get("aperture_id")),
    page_no: positiveIntegerOrNull(formData.get("page_no")),
    markup_type: markupType(clean(formData.get("markup_type"))),
    title,
    note: nullable(formData.get("note")),
    created_by: user.id,
  });

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/drawing-review`);
}

export async function resolveDrawingMarkup(projectId: string, markupId: string) {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_project_markups")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", markupId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/drawing-review`);
}

export async function createDesignApproval(projectId: string, formData: FormData) {
  const { supabase, user } = await requireProfessionalUser();
  const title = clean(formData.get("title"));
  if (!title) throw new Error("APPROVAL_TITLE_REQUIRED");

  const { error } = await supabase.from("professional_project_approvals").insert({
    project_id: projectId,
    aperture_id: nullable(formData.get("aperture_id")),
    spec_item_id: nullable(formData.get("spec_item_id")),
    approval_type: approvalType(clean(formData.get("approval_type"))),
    title,
    note: nullable(formData.get("note")),
    status: "draft",
    requested_by: user.id,
  });

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/approvals`);
}

export async function setDesignApprovalStatus(
  projectId: string,
  approvalId: string,
  status: "submitted" | "approved" | "revise" | "superseded"
) {
  const { supabase, user } = await requireProfessionalUser();
  const now = new Date().toISOString();
  const update: Record<string, string | null> = { status, updated_at: now };

  if (status === "submitted") {
    update.requested_at = now;
    update.reviewed_at = null;
    update.reviewed_by = null;
  }
  if (status === "approved" || status === "revise") {
    update.reviewed_at = now;
    update.reviewed_by = user.id;
  }

  const { error } = await supabase
    .from("professional_project_approvals")
    .update(update)
    .eq("id", approvalId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/approvals`);
}
