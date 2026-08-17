import Link from "next/link";

export const metadata = {
  title: "Choosing Curtain Fabrics: What Happens During a Home Consultation",
  description:
    "Learn how curtain fabrics are discussed during a home visit and how to choose the right material for apex, bay and large windows.",
};

export default function Page() {
  return (
   <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 text-white sm:pt-36">
      <h1 className="text-4xl font-semibold">
        Choosing the Right Curtain Fabrics for Your Space
      </h1>

      <p className="mt-6 text-white/70 leading-8">
        One of the most important parts of any curtain project is selecting the
        right fabric. During a home consultation, this is where ideas begin to
        take shape. Rather than choosing blindly online, fabrics are viewed in
        your actual room, against your light, colours and window proportions.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">
        Why fabric choice matters more for shaped windows
      </h2>

      <p className="mt-4 text-white/70 leading-8">
        Apex, triangular and large architectural windows require more thought
        than standard windows. The height, angles and scale of the glass mean
        that the fabric needs to hang correctly, flow naturally and complement
        the structure rather than fight against it.
      </p>

      <p className="mt-4 text-white/70 leading-8">
        Heavy fabrics can create a more dramatic and luxurious look, while
        lighter fabrics can soften the space and allow more natural light to
        pass through. The right choice depends on how you want the room to feel.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">
        Seeing fabrics in your own home
      </h2>

      <p className="mt-4 text-white/70 leading-8">
        Colours and textures can look very different depending on lighting.
        During a home visit, fabrics are viewed in natural daylight and evening
        conditions, helping you make a more confident decision.
      </p>

      <p className="mt-4 text-white/70 leading-8">
        This avoids the common mistake of choosing a fabric that looks right in
        a showroom or online, but feels completely different once installed.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">
        Texture, weight and drape
      </h2>

      <p className="mt-4 text-white/70 leading-8">
        Fabric is not just about colour. The weight and structure determine how
        the curtain will fall, especially on tall or angled windows.
      </p>

      <ul className="mt-4 list-disc pl-6 text-white/70 leading-8">
        <li>Heavier fabrics create defined folds and a premium finish</li>
        <li>Lighter fabrics give a softer, more relaxed look</li>
        <li>Textured weaves add depth and character to large spaces</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold">
        Matching fabrics to your interior style
      </h2>

      <p className="mt-4 text-white/70 leading-8">
        The right fabric should feel connected to the rest of your room. Whether
        your space is modern, traditional or a barn conversion, the curtain
        fabric plays a key role in tying everything together.
      </p>

      <p className="mt-4 text-white/70 leading-8">
        During the consultation, we help you choose fabrics that complement your
        furniture, wall colours and overall design direction.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">
        Practical considerations
      </h2>

      <p className="mt-4 text-white/70 leading-8">
        Fabric choice is also influenced by how the room is used. Bedrooms may
        require blackout linings, while living spaces may benefit from softer
        light-filtering fabrics.
      </p>

      <p className="mt-4 text-white/70 leading-8">
        We guide you through these practical decisions so the curtains not only
        look right, but function properly day to day.
      </p>

      <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-white/80">
          Choosing fabric during a home visit removes guesswork. You see how it
          works in your space, under your lighting, giving you confidence in the
          final result.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link
          href="/start-designing"
          className="rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black hover:bg-[#e6c476]"
        >
          Start your curtain journey
        </Link>

        <Link
          href="/advice"
          className="rounded-full border border-white/15 px-6 py-3 text-sm text-white hover:bg-white/10"
        >
          View more guides
        </Link>
      </div>
    </main>
  );
}
