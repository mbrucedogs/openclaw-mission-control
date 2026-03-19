export function parseMultilineDraft(value: string) {
  return value.split('\n');
}

export function hasMeaningfulMultilineContent(lines: string[]) {
  return lines.some((line) => line.trim().length > 0);
}

export function normalizeMultilineItems(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean);
}
