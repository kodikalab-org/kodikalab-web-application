export interface NavLink {
  label: string;
  path: string;
  fragment?: string;
  /** Header highlight: `true` only on the exact URL (Inicio); otherwise sub-routes such as `/concursos/3/5` keep it active. */
  exact?: boolean;
}

/** Links shown in the header bar (the first five entries of the full navigation). */
export const HEADER_LINK_COUNT = 5;

/**
 * Everything that is not in the header bar: progress, ranking, platforms and the profile pages.
 * These live in the user dropdown instead of a sidebar.
 */
export function profileMenuFor(coach: boolean): NavLink[] {
  return navigationFor(coach).slice(HEADER_LINK_COUNT);
}

export function navigationFor(coach: boolean): NavLink[] {
  const home = coach ? '/coach/inicio' : '/inicio';
  return [
    { label: 'Inicio', path: home, exact: true },
    { label: 'Problemas', path: coach ? '/coach/problemas-asignados' : '/practicante/problemas-asignados' },
    { label: 'Concursos', path: coach ? '/coach/concursos' : '/concursos' },
    { label: 'Grupos', path: '/grupos' },
    { label: 'Recursos', path: '/recursos' },
    ...(coach ? [
      { label: 'Solicitudes', path: '/coach/grupos/solicitudes' },
      { label: 'Seguimiento de grupos', path: '/coach/grupos/seguimiento' },
      { label: 'Rendimiento', path: '/coach/rendimiento' },
      { label: 'Resultados oficiales', path: '/coach/competencias' },
    ] : [
      { label: 'Progreso por tema', path: '/progreso' },
      { label: 'Progreso por equipo', path: '/progreso/equipos' },
      { label: 'Ranking', path: '/ranking' },
      { label: 'Plataformas competitivas', path: '/practicante/plataformas' },
    ]),
    { label: 'Mi perfil', path: coach ? '/coach/perfil' : '/perfil' },
    { label: 'Editar perfil', path: coach ? '/coach/perfil/editar' : '/perfil/editar' },
  ];
}
