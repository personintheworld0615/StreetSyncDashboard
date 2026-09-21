/** Report image URLs are sometimes stored without a file extension. */
export function reportImageCandidates(raw: string | null | undefined): string[] {
  const value = raw?.trim();
  if (!value) return [];
  if (value.startsWith("data:")) return [value];

  const urls = [value];
  const hasExt = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(value);
  if (!hasExt) {
    const withExt = [".jpg", ".jpeg", ".png", ".webp"].map((ext) => `${value}${ext}`);
    return [...withExt, value];
  }
  return urls;
}

export function primaryReportImageUrl(
  raw: string | null | undefined
): string | null {
  return reportImageCandidates(raw)[0] ?? null;
}
