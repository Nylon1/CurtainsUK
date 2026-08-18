"use server";

import { redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function stage(value: string) {
  const allowed = new Set(["concept","developed_design","technical_design","tender","construction","fit_out","handover"]);
  return allowed.has(value) ? value : "concept";
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
