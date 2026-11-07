import { routes } from '../../app.routes';
import { CONCURSOS_ROUTES } from './concursos.routes';

describe('Concursos routes', () => {
  it('lazy-loads the list and the contest detail under the concursos path', async () => {
    const [shell] = CONCURSOS_ROUTES;
    expect(shell.path).toBe('concursos');
    expect(shell.children?.map((child) => child.path)).toEqual(['', ':teamId/:competitionId']);
    for (const child of shell.children ?? []) expect(await child.loadComponent?.()).toBeTruthy();
  });

  it('is guarded as a PRACTICANTE page', () => {
    const route = routes.find((item) => item.path === 'concursos');
    expect(route?.data?.['role']).toBe('PRACTICANTE');
    expect(route?.canActivate?.length).toBe(1);
  });
});
