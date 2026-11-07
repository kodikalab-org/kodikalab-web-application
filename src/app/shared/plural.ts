/** `"1 problema"` / `"3 problemas"`: the count followed by the noun in the right grammatical number. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
