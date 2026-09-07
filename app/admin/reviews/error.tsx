"use client";

export default function AdminReviewsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#102c26] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-300/25 bg-red-950/30 p-7" role="alert">
        <p className="text-xs uppercase tracking-[0.2em] text-red-200">Review workspace unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold">The private review queue could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-red-100/75">No review decision or payment state was changed.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-full bg-red-100 px-5 py-3 text-sm font-semibold text-red-950">
          Try again
        </button>
      </div>
    </main>
  );
}

