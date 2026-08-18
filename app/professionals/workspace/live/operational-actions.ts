"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function provenance(value: string) {
  return ["confirmed_project_information", "design_team_preference", "apex_preliminary_recommendation", "unresolved"].includes(value)
    ? value
    : "unresolved";
}

function specStatus(value: string) {
  return ["unresolved", "preliminary", "confirmed", "superseded"].includes(value) ? value : "unresolved";
}

export async function uploadProjectDocument(projectId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("DOCUMENT_FILE_REQUIRED");
  if (file.size > 50 * 1024 * 1024) throw new Error("DOCUMENT_FILE_TOO_LARGE");

  const title = clean(formData.get("title")) || file.name;
  const revision = clean(formData.get("revision")) || null;
  const documentType = clean(formData.get("document_type")) || "other";
  const evidenceStatus = clean(formData.get("evidence_status")) || "for_review";
  const apertureId = clean(formData.get("aperture_id")) || null;
  const issuedAt = clean(formData.get("issued_at")) || null;
  const objectName = `${projectId}/${Date.now()}-${safeName(file.name) || "document"}`;

  const { error: uploadError } = await supabase.storage
    .from("professional-project-files")
    .upload(objectName, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("professional_project_documents").insert({
    project_id: projectId,
    aperture_id: apertureId,
    document_type: documentType,
    title,
    revision,
    source_url: objectName,
    evidence_status: evidenceStatus,
    provenance: provenance(clean(formData.get("provenance"))),
    issued_at: issuedAt,
  });

  if (error) {
    await supabase.storage.from("professional-project-files").remove([objectName]);
    throw error;
  }

  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  redirect(`/professionals/workspace/live/projects/${projectId}`);
}

export async function createSpecificationItem(projectId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const itemKey = clean(formData.get("item_key"));
  if (!itemKey) throw new Error("SPEC_ITEM_KEY_REQUIRED");

  const { error } = await supabase.from("professional_project_spec_items").insert({
    project_id: projectId,
    aperture_id: clean(formData.get("aperture_id")) || null,
    category: clean(formData.get("category")) || "general",
    item_key: itemKey,
    value_text: clean(formData.get("value_text")) || null,
    status: specStatus(clean(formData.get("status"))),
    provenance: provenance(clean(formData.get("provenance"))),
    source_document_id: clean(formData.get("source_document_id")) || null,
    notes: clean(formData.get("notes")) || null,
  });
  if (error) throw error;

  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  redirect(`/professionals/workspace/live/projects/${projectId}/specification/items`);
}

export async function updateSpecificationItem(projectId: string, specItemId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_project_spec_items")
    .update({
      value_text: clean(formData.get("value_text")) || null,
      status: specStatus(clean(formData.get("status"))),
      provenance: provenance(clean(formData.get("provenance"))),
      notes: clean(formData.get("notes")) || null,
      source_document_id: clean(formData.get("source_document_id")) || null,
    })
    .eq("id", specItemId)
    .eq("project_id", projectId);
  if (error) throw error;

  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/specification/items`);
  redirect(`/professionals/workspace/live/projects/${projectId}/specification/items`);
}
