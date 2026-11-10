const storefront = 'https://www.curtainsuk.com';
const contextKeys = ['source', 'space', 'direction', 'colour', 'primary', 'secondary', 'accent', 'fabric'] as const;

export function designGuideUrl(topic: string, search = ''): string {
  const url = new URL('/apps/curtainsuk-decision/design-guide', storefront);
  url.searchParams.set('topic', topic);
  const source = new URLSearchParams(search);
  for (const key of contextKeys) {
    const value = source.get(key);
    if (value && value.length <= 100 && /^[a-zA-Z0-9#-]+$/.test(value)) url.searchParams.set(key, value);
  }
  return url.toString();
}
