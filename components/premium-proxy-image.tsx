import type { CSSProperties } from 'react';
/* eslint-disable @next/next/no-img-element -- The existing image is served through the authenticated same-origin app proxy. */

export default function Image({ src, alt, fill, style, priority, ...rest }: {
  src: string; alt: string; fill?: boolean; style?: CSSProperties; priority?: boolean; sizes?: string;
}) {
  const source = src === '/reference-experience/living-room.jpg'
    ? '/apps/curtainsuk-decision/premium-asset?name=living-room.jpg' : src;
  void priority;
  return <img src={source} alt={alt} style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style } : style} {...rest} />;
}
