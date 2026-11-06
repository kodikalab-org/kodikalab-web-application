/** Identity comes from the account, never from guessing a name from its email. */
export function profileIdentity(
  fullName: string | null | undefined,
  email: string,
  fallback: string,
) {
  const name = fullName?.trim().replace(/\s+/g, ' ') ?? '';
  const words = name.split(' ');
  const initials = name
    ? [words[0], ...(words.length > 1 ? [words.at(-1)!] : [])]
        .map((word) => Array.from(word)[0])
        .join('')
        .toLocaleUpperCase('es-PE')
    : 'KL';
  return { name: name || fallback, email, initials };
}
