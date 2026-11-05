import {
  AjustesCoach,
  EquipoCoach,
  EstadisticasCoach,
  PerfilCoach,
  SolicitudIngreso,
} from '../models/perfil-coach';

// Datos de ejemplo tomados del Figma. No hay backend: el perfil del coach es fijo.
export const PERFIL_COACH_DEMO: PerfilCoach = {
  iniciales: 'MP',
  nombre: 'Marco Paredes',
  usuario: '@marcoparedes',
  rol: 'Coach',
  especialidad: 'Grafos y Programación Dinámica',
  organizacion: 'Club de Programación Competitiva',
  anios: 4,
  presentacion:
    'Entrenador de maratones ICPC. Trabajo con grafos, programación dinámica y simulacros semanales.',
};

export const EQUIPOS_COACH_DEMO: readonly EquipoCoach[] = [
  {
    iniciales: 'AL',
    nombre: 'Equipo Alfa',
    integrantes: 14,
    capacidad: 20,
    horario: 'Martes y jueves, 7:00 p. m.',
  },
  {
    iniciales: 'BE',
    nombre: 'Equipo Beta',
    integrantes: 10,
    capacidad: 20,
    horario: 'Miércoles, 6:00 p. m.',
  },
];

export const ESTADISTICAS_COACH_DEMO: EstadisticasCoach = { integrantesActivos: 24 };

export function crearSolicitudesDemo(): SolicitudIngreso[] {
  return [
    {
      iniciales: 'VN',
      nombre: 'Valeria Núñez',
      equipo: 'Equipo Alfa',
      nivel: 'Intermedio',
      fecha: '12 oct. 2024',
      estado: 'pendiente',
    },
    {
      iniciales: 'SC',
      nombre: 'Sebastián Cruz',
      equipo: 'Equipo Alfa',
      nivel: 'Principiante',
      fecha: '11 oct. 2024',
      estado: 'pendiente',
    },
    {
      iniciales: 'IM',
      nombre: 'Ítalo Mendoza',
      equipo: 'Equipo Beta',
      nivel: 'Avanzado',
      fecha: '9 oct. 2024',
      estado: 'pendiente',
    },
  ];
}

export const AJUSTES_COACH_DEMO: AjustesCoach = {
  notificaciones: true,
  privacidad: false,
  idioma: 'es',
  temaOscuro: true,
};
