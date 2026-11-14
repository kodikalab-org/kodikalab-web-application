/**
 * Internal URL to go back to after the login or a reconnection. Anything that is not a path of this
 * app (another origin, `//host`, a backslash trick) or that points to the access pages is rejected.
 */
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  const path = value.split(/[?#]/)[0];
  if (['/', '/login', '/registro', '/sin-conexion'].includes(path) || path.startsWith('/recuperar-contrasena')) return null;
  return value;
}
