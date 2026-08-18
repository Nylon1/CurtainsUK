import Link from "next/link";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { acceptProjectInvitation } from "@/app/professionals/workspace/control-actions";
import { getPendingInvitationByHash, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Project Invitation | Apex Professional Platform",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function Page({ params }: Props) {
  const { token } = await params;

  try {
    await requireProfessionalUser();
  } catch {
    redirect(`/professionals/workspace/login?next=${encodeURIComponent(`/professionals/workspace/invitations/${token}`)}`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  let result;
  try {
    result = await getPendingInvitationByHash(tokenHash);
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-apex-navy-950 px-4 text-white">
        <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-3xl font-semibold">Invitation unavailable</h1>
          <p className="mt-4 leading-7 text-[#C8D1D8]">This invitation may have expired, already been accepted, or belong to a different signed-in email address.</p>
          <Link href="/professionals/workspace/live" className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Open workspace</Link>
        </div>
      </main>
    );
  }

  const project = Array.isArray(result.invitation.professional_projects)
    ? result.invitation.professional_projects[0]
    : result.invitation.professional_projects;

  return (
    <main className="flex min-h-screen items-center justify-center bg-apex-navy-950 px-4 py-24 text-white">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#1B405B] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Professional project invitation</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Join {project?.name || "this Apex project"}</h1>
        <p className="mt-3 text-sm text-white/50">{project?.reference || result.invitation.project_id}</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><div className="text-xs uppercase tracking-[0.14em] text-white/45">Invited email</div><div className="mt-2 font-semibold">{result.invitation.email}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><div className="text-xs uppercase tracking-[0.14em] text-white/45">Project role</div><div className="mt-2 font-semibold">{result.invitation.role.replaceAll("_", " ")}</div></div>
        </div>
        <p className="mt-6 text-sm leading-7 text-[#C8D1D8]">Access is limited to this project through Row Level Security. Joining does not grant access to other Apex professional projects.</p>
        <form action={acceptProjectInvitation.bind(null, token)} className="mt-7">
          <button className="w-full rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Accept project invitation</button>
        </form>
      </div>
    </main>
  );
}
