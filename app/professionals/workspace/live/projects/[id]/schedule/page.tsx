import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfessionalUser } from "@/lib/professional-platform/server";

export const metadata = { title: "Window Treatment Schedule | Apex Professional", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

function pickSpec(items: any[], apertureId: string, terms: string[]) {
  const match = items.find((item) => {
    if (item.aperture_id !== apertureId) return false;
    const key = `${item.category} ${item.item_key}`.toLowerCase().replaceAll("_", " ");
    return terms.some((term) => key.includes(term));
  });
  return match?.value_text || "—";
}

function dimensions(aperture: any) {
  const parts = [];
  if (aperture.width_mm) parts.push(`W ${aperture.width_mm}mm`);
  if (aperture.left_height_mm) parts.push(`LH ${aperture.left_height_mm}mm`);
  if (aperture.right_height_mm) parts.push(`RH ${aperture.right_height_mm}mm`);
  if (aperture.peak_height_mm) parts.push(`PH ${aperture.peak_height_mm}mm`);
  return parts.length ? parts.join(" · ") : "Unresolved";
}

export default async function Page({ params }: Props) {
  let auth;
  try { auth = await requireProfessionalUser(); } catch { redirect("/professionals/workspace/login"); }
  const { id } = await params;
  const { supabase } = auth;

  const [projectResult, aperturesResult, specsResult, approvalsResult] = await Promise.all([
    supabase.from("professional_projects").select("id,reference,name").eq("id", id).single(),
    supabase.from("professional_project_apertures").select("*").eq("project_id", id).order("reference"),
    supabase.from("professional_project_spec_items").select("*").eq("project_id", id),
    supabase.from("professional_project_approvals").select("id,aperture_id,status,approval_type,title").eq("project_id", id),
  ]);

  if (projectResult.error || !projectResult.data) notFound();
  if (aperturesResult.error) throw aperturesResult.error;
  if (specsResult.error) throw specsResult.error;
  if (approvalsResult.error) throw approvalsResult.error;

  const project = projectResult.data;
  const apertures = aperturesResult.data || [];
  const specs = specsResult.data || [];
  const approvals = approvalsResult.data || [];

  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-[1600px]">
        <Link href={`/professionals/workspace/live/projects/${id}`} className="text-sm text-[#C8D1D8]">← {project.reference}</Link>
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Design coordination</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Window treatment schedule</h1>
            <p className="mt-4 max-w-4xl leading-8 text-[#C8D1D8]">A live project schedule built from the aperture register and specification record. Use it to identify unresolved design information before survey, manufacture release or installation planning.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/professionals/workspace/live/projects/${id}/apertures/new`} className="rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950">Add aperture</Link>
            <Link href={`/professionals/workspace/live/projects/${id}/approvals`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Design approvals</Link>
          </div>
        </div>

        <section className="mt-10 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
          {apertures.length === 0 ? (
            <div className="p-8 text-[#C8D1D8]">No apertures have been registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-black/20 text-xs uppercase tracking-[0.13em] text-white/45">
                  <tr>
                    <th className="px-5 py-4">Ref / room</th>
                    <th className="px-5 py-4">Window type</th>
                    <th className="px-5 py-4">Dimensions</th>
                    <th className="px-5 py-4">Track</th>
                    <th className="px-5 py-4">Fixing</th>
                    <th className="px-5 py-4">Heading</th>
                    <th className="px-5 py-4">Fabric</th>
                    <th className="px-5 py-4">Lining</th>
                    <th className="px-5 py-4">Stack / operation</th>
                    <th className="px-5 py-4">Approval</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {apertures.map((aperture) => {
                    const apertureApprovals = approvals.filter((approval) => approval.aperture_id === aperture.id);
                    const approved = apertureApprovals.some((approval) => approval.status === "approved");
                    const submitted = apertureApprovals.some((approval) => approval.status === "submitted");
                    return (
                      <tr key={aperture.id} className="align-top hover:bg-white/[0.025]">
                        <td className="px-5 py-5"><Link href={`/professionals/workspace/live/projects/${id}/apertures/${aperture.id}`} className="font-semibold text-[#F4F0E8] hover:text-[#d6b56b]">{aperture.reference}</Link><div className="mt-1 text-xs text-white/45">{aperture.room || "Room unresolved"}</div></td>
                        <td className="px-5 py-5 text-[#C8D1D8]">{aperture.window_type || "—"}</td>
                        <td className="px-5 py-5 text-[#C8D1D8]">{dimensions(aperture)}</td>
                        <td className="px-5 py-5 text-[#C8D1D8]">{aperture.track_route || pickSpec(specs, aperture.id, ["track", "rail"])}</td>
                        <td className="px-5 py-5 text-[#C8D1D8]"><div>{aperture.fixing_position || "—"}</div><div className="mt-1 text-xs text-white/45">{aperture.fixing_substrate || "substrate unresolved"}</div></td>
                        <td className="px-5 py-5 text-[#C8D1D8]">{pickSpec(specs, aperture.id, ["heading", "pleat"])}</td>
                        <td className="px-5 py-5 text-[#C8D1D8]">{pickSpec(specs, aperture.id, ["fabric", "textile", "cloth"])}</td>
                        <td className="px-5 py-5 text-[#C8D1D8]">{pickSpec(specs, aperture.id, ["lining", "blackout", "interlining"])}</td>
                        <td className="px-5 py-5 text-[#C8D1D8]"><div>{aperture.stack_back_requirement || "—"}</div><div className="mt-1 text-xs text-white/45">{aperture.operation || "operation unresolved"}</div></td>
                        <td className="px-5 py-5"><span className={approved ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200" : submitted ? "rounded-full bg-[#d6b56b]/10 px-3 py-1 text-xs font-semibold text-[#d6b56b]" : "rounded-full border border-white/10 px-3 py-1 text-xs text-white/45"}>{approved ? "Approved" : submitted ? "In review" : "Not submitted"}</span></td>
                        <td className="px-5 py-5"><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#C8D1D8]">{aperture.status.replaceAll("_", " ")}</span><div className="mt-2 text-[11px] text-white/40">{aperture.provenance.replaceAll("_", " ")}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[24px] border border-[#d6b56b]/20 bg-[#d6b56b]/10 p-6 text-sm leading-7 text-[#C8D1D8]">
          Schedule status does not itself mean an aperture is approved for manufacture. Geometry, fixing context, specification evidence and formal project approval still need to be resolved through the controlled project record.
        </section>
      </div>
    </main>
  );
}
