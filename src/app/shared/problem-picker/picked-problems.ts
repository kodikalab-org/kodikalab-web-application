import type { AssignItem, CatalogProblem } from '../../core/problems-api';
import type { CodeforcesSearchResult } from '../../core/codeforces-problems-api';

/** A contest takes at most one letter per problem and the picker offers A to Z. */
export const MAX_PICKED = 26;
/** Default points of a problem: one per problem in ICPC contests, 100 in IOI ones. */
export const ICPC_SCORE = 1;
export const IOI_SCORE = 100;

/** Default balloon color of each letter (the color is stored with the problem, so reordering keeps it). */
export const PALETTE = [
  '#E6194B',
  '#3CB44B',
  '#FFE119',
  '#4363D8',
  '#F58231',
  '#911EB4',
  '#46F0F0',
  '#F032E6',
  '#BCF60C',
  '#FABEBE',
  '#008080',
  '#E6BEFF',
  '#9A6324',
  '#FFFAC8',
  '#800000',
  '#AAFFC3',
  '#808000',
  '#FFD8B1',
  '#000075',
  '#808080',
  '#FF69B4',
  '#00CED1',
  '#B8860B',
  '#7FFFD4',
  '#DC143C',
  '#6495ED',
];

/** One problem chosen for a contest, with the letter, points and balloon color the contest will use. */
export interface PickedProblem {
  problem: CatalogProblem;
  letter: string;
  score: number;
  /** `#rrggbb` as the color input returns it; upper-cased when the request is built. */
  balloonColor: string;
}

/** Letter of the row at `index`: A, B, ... Z, AA, AB, ... */
export function letterFor(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  return index < 26 ? letter : letterFor(Math.floor(index / 26) - 1) + letter;
}

/** Same rows with the letters recomputed from their position. */
export function relabel(rows: readonly PickedProblem[]): PickedProblem[] {
  return rows.map((row, index) => ({ ...row, letter: letterFor(index) }));
}

/** Moves the row one step (`-1` up, `1` down); returns the same array when it cannot move. */
export function moveRow(rows: PickedProblem[], index: number, step: -1 | 1): PickedProblem[] {
  const target = index + step;
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return relabel(next);
}

/** Items of `POST /problems/assign` in the order of the rows. */
export function toAssignItems(rows: readonly PickedProblem[]): AssignItem[] {
  return rows.map((row) => ({
    problemId: row.problem.id,
    letter: row.letter,
    score: row.score,
    balloonColor: row.balloonColor.trim().toUpperCase(),
  }));
}

/** Catalog-shaped problem of a Codeforces search hit that is already in the catalog (`problemId` set). */
export function problemFromHit(
  hit: CodeforcesSearchResult & { problemId: number },
): CatalogProblem {
  return {
    id: hit.problemId,
    title: hit.title,
    url: hit.url,
    sourcePlatform: 'CODEFORCES',
    sourceCode: hit.code,
    difficultyRating: hit.difficultyRating === null ? null : String(hit.difficultyRating),
    timeLimitMs: null,
    memoryLimitMb: null,
    topics: hit.topics.map((name, index) => ({ id: -(index + 1), name })),
  };
}
