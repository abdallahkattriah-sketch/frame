export function extractMalCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const fromUrl = /[?&#]code=([^&\s#]+)/.exec(trimmed);
  if (fromUrl) {
    try {
      return decodeURIComponent(fromUrl[1]).trim();
    } catch {
      return fromUrl[1].trim();
    }
  }
  return trimmed.replace(/^["'\s]+|["'\s]+$/g, "");
}

export function extractMalState(input: string): string | null {
  const m = /[?&#]state=([^&\s#]+)/.exec(input.trim());
  return m ? m[1] : null;
}
