export function currentMentionQuery(text: string) {
  return text.match(/(?:^|\s)@([^\s@]*)$/u)?.[1];
}

export function insertMention(text: string, label: string) {
  return text.replace(/@[^\s@]*$/u, `@${label.trim()} `);
}

export function splitMentionText(text: string, names: string[]) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean))).sort((a, b) => b.length - a.length);
  if (!uniqueNames.length) return [{ text, mention: false }];
  const escaped = uniqueNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(@(?:${escaped.join("|")}))`, "giu");
  const normalized = new Set(uniqueNames.map((name) => `@${name}`.toLocaleLowerCase("pt-BR")));
  return text.split(matcher).filter(Boolean).map((part) => ({ text: part, mention: normalized.has(part.toLocaleLowerCase("pt-BR")) }));
}
