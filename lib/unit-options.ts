export const UNIT_OPTIONS = [
  "шт",
  "кг",
  "т",
  "м",
  "м²",
  "м³",
  "п.м.",
  "лист",
  "час",
  "усл.",
  "компл.",
];

export function getUnitOptions(currentUnit?: string | null) {
  const normalizedUnit = currentUnit?.trim();

  if (!normalizedUnit || UNIT_OPTIONS.includes(normalizedUnit)) {
    return UNIT_OPTIONS;
  }

  return [normalizedUnit, ...UNIT_OPTIONS];
}
