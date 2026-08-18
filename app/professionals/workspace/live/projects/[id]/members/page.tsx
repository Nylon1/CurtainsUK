import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createProjectInvitation } from "@/app/professionals/workspace/control-actions";
import { getProjectCollaboration, requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = {
  title: "Project Team | Apex Professional Platform",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; email?: string }>;
};

const roles = [
  ["architect", "Architect"],
  ["interior_designer", "Interior designer"],
  ["developer", "Developer"],
  ["housebuilder", "Housebuilder"],
  ["contractor", "Contractor"],
  ["fit_out", "Fit-out"],
  ["consultant", "Consultant"],
  ["collaborator", "Collaborator"],
  ["viewer", "Viewer"],
];

export default async function Page({ params, searchParams }: Props) {
  try {
    await requireProfessionalUser();
  } catch {
    redirect("/professionals/workspace/login");
  }

  const { id } = await params;
  const query = await searchParams;
  let data;
  try {
    data = await getProjectCollaboration(id);
  } catch {
    notFound();
  }

  const sentEmail = query.email ? decodeURIComponent(query.email) : null;
  const accountInviteSent = query.sent === "account";
  const magicLinkSent = query.sent === "magic";

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8] hover:text-white">← {data.project.reference}</Link>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Project collaboration</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Project team & invitations</h1>
            <p className="mt-4 max-w-3xl text-[#C8D1D8]">Access is project-scoped. Apex can now provision the account, send the secure email and grant access to this project without opening public self-registration.</p>
          </div>
          <Link href={`/professionals/workspace/live/projects/${id}/exports`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Controlled exports</Link>
        </div>

        {(accountInviteSent || magicLinkSent) && sentEmail && (
          <section className="mt-8 rounded-[28px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Access email sent</p>
            <h2 className="mt-3 text-xl font-semibold">{sentEmail}</h2>
            <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">
              {accountInviteSent
                ? "A new professional account has been provisioned. The recipient has been emailed a secure invitation and will set a password before opening the workspace."
                : "This email already has an Apex account. A secure sign-in link has been sent and the project is now available to that account."}
            </p>
          </section>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Current members</p>
            <div className="mt-5 space-y-3">
              {data.members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold">{member.role.replaceAll("_", " ")}</div>
                    <span className="text-xs text-white/45">{member.user_id === data.project.created_by ? "Project owner" : "Project member"}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#C8D1D8]">{member.organisation || "Organisation not set"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {data.isOwner && (
              <form action={createProjectInvitation.bind(null, id)} className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Invite project member</p>
                <h2 className="mt-3 text-xl font-semibold">Email access directly from Apex</h2>
                <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">New users receive an account invitation and password-setup journey. Existing users receive a secure sign-in link. Access remains limited to this project.</p>
                <div className="mt-5 space-y-4">
                  <label className="block"><span className="text-sm font-semibold">Email</span><input name="email" type="email" required className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" /></label>
                  <label className="block"><span className="text-sm font-semibold">Role</span><select name="role" className="mt-2 w-full rounded-2xl border border-white/10 bg-apex-navy-950 px-4 py-3">{roles.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="block"><span className="text-sm font-semibold">Organisation</span><input name="organisation" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" /></label>
                  <button className="w-full rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Send secure access email</button>
                </div>
              </form>
            )}

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Invitation register</p>
              <div className="mt-5 space-y-3">
                {data.invitations.length === 0 ? <p className="text-sm text-[#C8D1D8]">No invitations visible.</p> : data.invitations.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-white/10 p-4 text-sm">
                    <div className="font-semibold">{invite.email}</div>
                    <div className="mt-1 text-[#C8D1D8]">{invite.role.replaceAll("_", " ")} · {invite.organisation || "No organisation"}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.14em] text-white/45">{invite.status} · access provisioned {invite.accepted_at ? new Date(invite.accepted_at).toLocaleDateString("en-GB") : "pending"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
