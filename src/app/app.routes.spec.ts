import { routes } from './app.routes';

describe('rutas de asignación de problemas', () => {
  const rol = (path: string) => routes.find((r) => r.path === path)?.data?.['role'];

  it('las pantallas del coach exigen el rol COACH', () => {
    expect(rol('coach/asignar-problema')).toBe('COACH');
    expect(rol('coach/problemas-asignados')).toBe('COACH');
  });

  it('las pantallas del practicante exigen el rol PRACTICANTE', () => {
    expect(rol('practicante/problemas-asignados')).toBe('PRACTICANTE');
  });
});
