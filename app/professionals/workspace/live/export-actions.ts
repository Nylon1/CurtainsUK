"use server";

import { revalidatePath } from "next/cache";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export async function issueControlledExport(projectId: string, exportId: string, formData: FormData) {
  const { supabase } = await requireProfessionalUser();
  const noteValue = formData.get("issue_note");
  const issueNote = typeof noteValue === "string" && noteValue.trim() ? noteValue.trim() : null;

  const { error } = await supabase
    .from("professional_project_exports")
    .update({ status: "issued", issued_at: new Date().toISOString(), issue_note: issueNote })
    .eq("id", exportId)
    .eq("project_id", projectId)
    .eq("status", "preliminary");

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/exports`);
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/exports/${exportId}`);
}

export async function supersedeControlledExport(projectId: string, exportId: string) {
  const { supabase } = await requireProfessionalUser();
  const { error } = await supabase
    .from("professional_project_exports")
    .update({ status: "superseded", superseded_at: new Date().toISOString() })
    .eq("id", exportId)
    .eq("project_id", projectId)
    .neq("status", "superseded");

  if (error) throw error;
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/exports`);
  revalidatePath(`/professionals/workspace/live/projects/${projectId}/exports/${exportId}`);
}
