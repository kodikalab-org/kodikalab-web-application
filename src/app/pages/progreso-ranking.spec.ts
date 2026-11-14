import { routes } from '../app.routes';
import { accessGuard } from '../core/access-guard';

describe('Interfaces de progreso y ranking', () => {
  it('conserva los guards y roles de develop en las cuatro rutas nuevas', () => {
    for (const path of ['progreso', 'ranking', 'progreso/equipos', 'coach/rendimiento']) {
      const route = routes.find((item) => item.path === path)!;
      expect(route.canActivate).toContain(accessGuard);
      expect(route.data?.['role']).toBe(path.startsWith('coach/') ? 'COACH' : 'PRACTICANTE');
    }
    expect(routes.find((route) => route.path === 'grupos')).toBeDefined();
    expect(routes.find((route) => route.path === 'coach/grupos')).toBeDefined();
    expect(routes.at(-1)?.path).toBe('**');
  });
});
