import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cityPages, getCityBySlug } from "@/lib/cities";

type Props = {
  citySlug: string;
};

type ProjectRow = {
  title?: string | null;
  slug?: string | null;
  location?: string | null;
  category?: string | null;
  room?: string | null;
  heading?: string | null;
  lining?: string | null;
};

async function getLocalProjects(cityName: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery_projects")
    .select("title,slug,location,category,room,heading,lining")
    .ilike("location", `%${cityName}%`)
    .limit(6);

  return (data || []) as ProjectRow[];
}

export default async function LocalAuthoritySection({ citySlug }: Props) {
  const city = getCityBySlug(citySlug);
  if (!city) return null;

  const projects = await getLocalProjects(city.name);
  const sameRegion = cityPages
    .filter((item) => item.slug !== city.slug && item.region === city.region)
    .slice(0, 6);

  return (
    <section className="bg-apex-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
            Local specialist journey
          </p>
          <h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
            From a difficult window in {city.name} to a complete curtain specification
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-8 text-[#C8D1D8]">
            The local page is the starting point, not a separate island. Use the specialist guides below to move from window shape to curtain design, track choice, installation planning and a real project enquiry.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["/window-types", "Choose the window type", "Apex, triangular, gable-end, barn conversion and large glazing."],
              ["/curtain-design-guide", "Build the curtain specification", "Heading, fabric, lining, accessories and practical design choices."],
              ["/curtain-tracks", "Plan the track", "Track route, fixing surface, curtain weight and operation."],
              ["/services/premium-installation", "Plan installation", "Access, fixing, final hanging and on-site checks."],
            ].map(([href, title, text]) => (
              <Link
                key={href}
                href={href}
                className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:-translate-y-0.5 hover:border-[#d6b56b]/35"
              >
                <h3 className="text-xl font-semibold text-[#F4F0E8]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{text}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
            Project evidence
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            {projects.length > 0
              ? `Recorded gallery projects in ${city.name}`
              : `Explore recorded Apex Curtains projects`}
          </h2>
          <p className="mt-4 max-w-4xl leading-8 text-[#C8D1D8]">
            {projects.length > 0
              ? "These links are shown because the stored gallery location matches this city. Project details are limited to the information recorded for each case study."
              : `There is not currently a gallery project whose stored location matches ${city.name}. Rather than inventing local project proof, we link to the main gallery until a matching case study is recorded.`}
          </p>

          {projects.length > 0 ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.slug || project.title}
                  href={`/gallery/${project.slug}`}
                  className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#d6b56b]/35"
                >
                  <h3 className="text-xl font-semibold text-[#F4F0E8]">{project.title}</h3>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#C8D1D8]">
                    {[project.location, project.category, project.room, project.heading, project.lining]
                      .filter(Boolean)
                      .map((value) => (
                        <span key={value} className="rounded-full border border-white/10 px-3 py-1.5">
                          {value}
                        </span>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-7">
              <Link
                href="/gallery"
                className="inline-flex rounded-full border border-[#d6b56b]/30 bg-[#d6b56b]/10 px-5 py-3 text-sm font-semibold text-[#F4F0E8]"
              >
                View real projects
              </Link>
            </div>
          )}
        </div>

        {sameRegion.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
              More in {city.region}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {sameRegion.map((item) => (
                <Link
                  key={item.slug}
                  href={`/areas/${item.slug}`}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-[#F4F0E8] transition hover:bg-white/10"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
