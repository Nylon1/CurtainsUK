"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function emit(event: string, data: Record<string, string | number | boolean> = {}) {
  const detail = { event, ...data };
  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent("apex:conversion", { detail }));
}

export default function StartDesigningAnalytics() {
  useEffect(() => {
    emit("curtain_journey_view", { source: "start_designing" });

    let completed = false;

    const detectCompletion = () => {
      if (completed) return;

      const headings = Array.from(document.querySelectorAll("h1"));
      const successHeading = headings.some((heading) =>
        heading.textContent?.includes("Thank you for your enquiry")
      );

      if (successHeading) {
        completed = true;
        emit("lead_submission_complete", { source: "start_designing" });
        observer.disconnect();
      }
    };

    const observer = new MutationObserver(detectCompletion);
    observer.observe(document.body, { childList: true, subtree: true });
    detectCompletion();

    return () => observer.disconnect();
  }, []);

  return null;
}
