"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const FabricPersonalityQuiz = dynamic(
  () => import("@/components/homepage/FabricPersonalityQuiz"),
  { ssr: false }
);

export default function LazyFabricQuiz() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;

    const node = anchorRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={anchorRef} className="min-h-[320px]" aria-live="polite">
      {shouldLoad ? <FabricPersonalityQuiz /> : null}
    </div>
  );
}
