"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type Props = ComponentProps<typeof Link> & {
  eventName: string;
  eventData?: Record<string, string | number | boolean | undefined>;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export default function TrackedLink({ eventName, eventData, onClick, ...props }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const detail = { event: eventName, ...eventData };

    window.dataLayer?.push(detail);
    window.dispatchEvent(new CustomEvent("apex:conversion", { detail }));
    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}
