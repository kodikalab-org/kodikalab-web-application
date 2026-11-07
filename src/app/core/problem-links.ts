/** Fields of a problem (as returned by `/problems/assigned`) needed to build its links. */
export interface ProblemLinkSource {
  url?: string | null;
  sourcePlatform?: string | null;
  sourceCode?: string | null;
}

const CODEFORCES_URL = /codeforces\.com\/(?:contest|gym|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Za-z][A-Za-z0-9]*)/i;
const CODEFORCES_CODE = /^(\d+)([A-Za-z][A-Za-z0-9]*)$/;

/**
 * Page where the practitioner submits the solution on the original platform. Code is never stored in
 * KodikaLab: the practitioner submits there (logged in on that platform) and pastes the submission URL as evidence.
 * Falls back to the problem statement URL when the platform has no known submit page.
 */
export function submitUrl(problem: ProblemLinkSource): string | null {
  const codeforces = codeforcesId(problem);
  if (codeforces) {
    const gym = /codeforces\.com\/gym\//i.test(problem.url ?? '');
    return `https://codeforces.com/${gym ? 'gym' : 'contest'}/${codeforces.contest}/submit/${codeforces.index}`;
  }
  return problem.url?.trim() || null;
}

/** Codeforces contest id and problem index, from the statement URL or the `sourceCode` (for example `1850A`). */
export function codeforcesId(problem: ProblemLinkSource): { contest: string; index: string } | null {
  const fromUrl = CODEFORCES_URL.exec(problem.url ?? '');
  if (fromUrl) return { contest: fromUrl[1], index: fromUrl[2].toUpperCase() };
  const isCodeforces = (problem.sourcePlatform ?? '').toUpperCase().includes('CODEFORCES');
  const fromCode = isCodeforces ? CODEFORCES_CODE.exec((problem.sourceCode ?? '').trim()) : null;
  return fromCode ? { contest: fromCode[1], index: fromCode[2].toUpperCase() } : null;
}
