import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps internal private paths with their query', () => {
    expect(safeReturnUrl('/concursos/3?teamId=2')).toBe('/concursos/3?teamId=2');
  });
  it('rejects other origins and the access pages', () => {
    for (const value of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/login?x=1', '/', '/sin-conexion', '/recuperar-contrasena/codigo']) {
      expect(safeReturnUrl(value)).toBeNull();
    }
  });
});
