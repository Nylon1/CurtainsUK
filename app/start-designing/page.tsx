import { Suspense } from "react";
import StartDesigningClient from "@/components/start-designing/StartDesigningClient";

export const dynamic = "force-dynamic";

export default function StartDesigningPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-apex-navy-900 text-white flex items-center justify-center">
          Loading...
        </main>
      }
    >
      <StartDesigningClient />
    </Suspense>
  );
}