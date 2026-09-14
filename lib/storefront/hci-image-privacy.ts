/** The pinned adapter returns derived evidence only. Never persist raw reference media. */
export const HCI_IMAGE_PRIVACY = {
  version: "curtainsuk-reference-privacy-v1",
  maximumImages: 1,
  rawImageRetention: "REQUEST_ONLY",
  maximumRetentionDays: 30,
  trainingPermission: false,
} as const;

export function assertNoRawReferenceMedia(value: unknown): void {
  const inspect = (node: unknown, path = ""): void => {
    if (typeof node === "string") {
      if (/^data:image\//i.test(node) || /^[A-Za-z0-9+/]{4096,}={0,2}$/.test(node))
        throw Error("HCI_RAW_IMAGE_RETENTION_REJECTED");
      return;
    }
    if (Array.isArray(node)) { node.forEach((child,index)=>inspect(child,`${path}.${index}`)); return; }
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (/^(bytes|base64|rawImage|imageBytes|imageData|pixels)$/i.test(key) || (key === 'imageUrl' && !/\.(candidates\.\d+|strongestOmitted)\.binding$/.test(path)))
          throw Error("HCI_RAW_IMAGE_RETENTION_REJECTED");
        inspect(child,`${path}.${key}`);
      }
    }
  };
  inspect(value);
}
