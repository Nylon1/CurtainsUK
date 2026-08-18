import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/professionals/workspace/login", request.url);
    login.searchParams.set("next", `/professionals/workspace/live/projects/${id}`);
    return NextResponse.redirect(login);
  }

  const { data: document, error } = await supabase
    .from("professional_project_documents")
    .select("id,project_id,source_url")
    .eq("id", documentId)
    .eq("project_id", id)
    .single();

  if (error || !document?.source_url || document.source_url.startsWith("http")) {
    return new NextResponse("Document unavailable", { status: 404 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("professional-project-files")
    .createSignedUrl(document.source_url, 60);

  if (signedError || !signed?.signedUrl) {
    return new NextResponse("Document unavailable", { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
