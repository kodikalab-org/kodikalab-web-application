import { plural } from './plural';

describe('plural', () => {
  it('uses the singular only for exactly one', () => {
    expect(plural(1, 'integrante activo', 'integrantes activos')).toBe('1 integrante activo');
    expect(plural(0, 'integrante activo', 'integrantes activos')).toBe('0 integrantes activos');
    expect(plural(14, 'integrante activo', 'integrantes activos')).toBe('14 integrantes activos');
  });

  it('falls back to adding an s to the singular', () => {
    expect(plural(1, 'problema')).toBe('1 problema');
    expect(plural(3, 'problema')).toBe('3 problemas');
  });
});
