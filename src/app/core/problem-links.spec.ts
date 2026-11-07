import { codeforcesId, submitUrl } from './problem-links';

describe('problem links', () => {
  it('builds the Codeforces submit page from a problemset URL', () => {
    expect(submitUrl({ url: 'https://codeforces.com/problemset/problem/1850/A' }))
      .toBe('https://codeforces.com/contest/1850/submit/A');
  });

  it('builds the submit page from a contest URL and keeps gym contests in gym', () => {
    expect(submitUrl({ url: 'https://codeforces.com/contest/1234/problem/c1' }))
      .toBe('https://codeforces.com/contest/1234/submit/C1');
    expect(submitUrl({ url: 'https://codeforces.com/gym/104000/problem/B' }))
      .toBe('https://codeforces.com/gym/104000/submit/B');
  });

  it('uses the Codeforces source code when the URL has no ids', () => {
    expect(codeforcesId({ sourcePlatform: 'CODEFORCES', sourceCode: '1850a' })).toEqual({ contest: '1850', index: 'A' });
    expect(submitUrl({ url: null, sourcePlatform: 'CODEFORCES', sourceCode: '1850A' }))
      .toBe('https://codeforces.com/contest/1850/submit/A');
  });

  it('falls back to the statement URL for other platforms and to null without data', () => {
    expect(submitUrl({ url: 'https://leetcode.com/problems/two-sum/', sourcePlatform: 'LEETCODE' }))
      .toBe('https://leetcode.com/problems/two-sum/');
    expect(submitUrl({ sourcePlatform: 'LEETCODE', sourceCode: 'two-sum' })).toBeNull();
  });
});
