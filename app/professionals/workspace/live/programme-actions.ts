"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableDate(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text || null;
}

export async function updateProjectProgramme(projectId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_projects")
    .update({
      survey_target_at: nullableDate(formData.get("survey_target_at")),
      design_freeze_target_at: nullableDate(formData.get("design_freeze_target_at")),
      manufacture_release_target_at: nullableDate(formData.get("manufacture_release_target_at")),
      installation_target_at: nullableDate(formData.get("installation_target_at")),
    })
    .eq("id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/programme`);
  redirect(`/professionals/workspace/live/projects/${projectId}/programme`);
}

export async function updateActionResponsibility(projectId: string, actionId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const responsibility = clean(formData.get("responsibility_text")) || null;
  const priority = clean(formData.get("priority")) || "normal";
  const dueAt = nullableDate(formData.get("due_at"));

  const { error } = await supabase
    .from("professional_project_actions")
    .update({ responsibility_text: responsibility, priority, due_at: dueAt })
    .eq("id", actionId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}`);
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/programme`);
}
