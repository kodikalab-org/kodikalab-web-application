import { privateRoutes, routes } from '../app.routes';
import { accessGuard } from '../core/access-guard';

describe('Interfaces de progreso y ranking', () => {
  it('conserva los guards y roles de develop en las cuatro rutas nuevas', () => {
    const shell = routes.find((item) => item.children === privateRoutes)!;
    expect(shell.canActivateChild).toContain(accessGuard);
    for (const path of ['progreso', 'ranking', 'progreso/equipos', 'coach/rendimiento']) {
      const route = privateRoutes.find((item) => item.path === path)!;
      expect(route.data?.['role']).toBe(path.startsWith('coach/') ? 'COACH' : 'PRACTICANTE');
    }
    expect(privateRoutes.find((route) => route.path === 'grupos')).toBeDefined();
    expect(privateRoutes.find((route) => route.path === 'coach/grupos')).toBeDefined();
    expect(routes.at(-1)?.path).toBe('**');
  });
});
