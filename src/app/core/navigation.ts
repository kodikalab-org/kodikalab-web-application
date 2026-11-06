export function navigationFor(coach: boolean) {
  const home = coach ? '/coach/inicio' : '/inicio';
  return [
    { label: 'Inicio', path: home },
    { label: coach ? 'Solicitudes' : 'Problemas', path: coach ? '/coach/grupos/solicitudes' : home, fragment: coach ? undefined : 'problemas' },
    { label: 'Concursos', path: coach ? '/coach/competencias' : home, fragment: coach ? undefined : 'competencias' },
    { label: 'Grupos', path: coach ? '/coach/grupos/crear' : '/grupos' },
    { label: 'Recursos', path: '/recursos' },
    ...(coach ? [
      { label: 'Seguimiento de grupos', path: '/coach/grupos/seguimiento' },
      { label: 'Rendimiento', path: '/coach/rendimiento' },
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
