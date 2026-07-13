const dashVariants = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\ufe63\uff0d]/g;
const slashVariants = /[\uff0f\u2044\u2215]/g;
const whitespace = /\s+/g;

export function normalizeEquipmentLabel(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(dashVariants, "-")
    .replace(slashVariants, "/")
    .replace(whitespace, " ");
}

export function nullableNormalizedEquipmentLabel(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = normalizeEquipmentLabel(value);
  return normalized || null;
}
