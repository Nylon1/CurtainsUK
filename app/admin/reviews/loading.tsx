export default function AdminReviewsLoading() {
  return (
    <main className="min-h-screen bg-[#102c26] px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl" role="status" aria-live="polite">
        <p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Private curtain operations</p>
        <h1 className="mt-3 text-4xl font-semibold">Loading review queue…</h1>
      </div>
    </main>
  );
}

