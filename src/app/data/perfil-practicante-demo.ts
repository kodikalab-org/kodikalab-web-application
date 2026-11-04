import {
  EstadisticaPerfil,
  FiltroSolicitud,
  InfoPersonalPracticante,
  OpcionEdicion,
  OpcionSelect,
  PlataformaEdicion,
  PlataformaPerfil,
  SolicitudGrupo,
  SubmissionPracticante,
} from '../models/perfil-practicante';
import { USUARIO_DEMO } from './usuario-demo';

/**
 * Hardcoded profile content for the practicante screens (no backend yet). Name, career,
 * cycle, district, code and level come from USUARIO_DEMO; the rest are the sample values
 * shown in Figma. Replace with the GET /api/users/me response once the integration starts.
 */
const NIVELES: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

export const INFO_PERSONAL_DEMO: InfoPersonalPracticante = {
  iniciales: `${USUARIO_DEMO.nombres[0]}${USUARIO_DEMO.apellidos[0]}`,
  nombreCompleto: `${USUARIO_DEMO.nombres} ${USUARIO_DEMO.apellidos} Vargas`,
  usuario: '@camilarojas',
  rol: 'Practicante',
  carreraCiclo: `${USUARIO_DEMO.carrera} · ${USUARIO_DEMO.ciclo}`,
  universidad: 'Universidad Peruana de Ciencias Aplicadas (UPC)',
  ubicacion: `${USUARIO_DEMO.distrito}, Lima`,
  nivelCodigo: `Nivel competitivo: ${NIVELES[USUARIO_DEMO.nivel]} · Código ${USUARIO_DEMO.codigoEstudiante}`,
  objetivo:
    'Objetivo: clasificar a competencias universitarias y mejorar mi nivel en grafos y programación dinámica.',
};

export const PLATAFORMAS_PERFIL_DEMO: PlataformaPerfil[] = [
  { nombre: 'Codeforces', usuario: '_matjavi_', icono: 'images/onboarding/codeforces-34.svg' },
  { nombre: 'AtCoder', usuario: 'matjavi', icono: 'images/onboarding/atcoder-34.svg' },
  { nombre: 'VJudge', usuario: 'matjavi', icono: 'images/perfil/vjudge-34.svg' },
];

export const ESTADISTICAS_DEMO: EstadisticaPerfil[] = [
  {
    valor: '569',
    etiqueta: 'Problemas resueltos',
    detalle: '+48 este año',
    tono: 'exito',
    icono: 'images/perfil/stat-check-24.svg',
    iconoDetalle: 'images/perfil/trend-up-14.svg',
  },
  {
    valor: '17 días',
    etiqueta: 'Racha máxima',
    detalle: 'Mejor marca',
    tono: 'alerta',
    icono: 'images/perfil/stat-flame-24.svg',
    iconoDetalle: 'images/perfil/trophy-14.svg',
  },
  {
    valor: '1984',
    etiqueta: 'Rating actual',
    detalle: 'Top 12 %',
    tono: 'turquesa',
    icono: 'images/perfil/stat-bars-24.svg',
    iconoDetalle: 'images/perfil/star-top-14.svg',
  },
  {
    valor: '248',
    etiqueta: 'Submissions aceptadas',
    detalle: '65.3 % de aceptación',
    tono: 'violeta',
    icono: 'images/perfil/stat-file-24.svg',
    iconoDetalle: 'images/perfil/trend-up-14.svg',
  },
];

/** Heatmap sample data: 7 rows (Mon..Sun) x 40 weeks, one digit (intensity level) per cell. */
export const HEATMAP_ACTIVIDAD_DEMO: string[] = [
  '0000002001010230020000010100223003000002',
  '0002111311100200100000000010020300110113',
  '1010100020100200100220002030100202030100',
  '0030001012302000000132003000203002000001',
  '0010010223200001210000022030021230030020',
  '0000002000000003200000302031100310302100',
  '0232001011020211200003222033320100000211',
];

export const HEATMAP_RATING_DEMO: string[] = [
  '0110000302100003201305022310055000000000',
  '1101340010000210400104502012101300320101',
  '5240142020003000040001242201000530413101',
  '0040130500241005402501405310005530000301',
  '1010023000030043520011010143110020020422',
  '1010100402104000100000121130001141000100',
  '0300004040050110031000055022100000301002',
];

export const MESES_HEATMAP = [
  'Nov',
  'Dic',
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
];

/** Only Lun, Mié and Vie are labelled in Figma; the other rows keep their space. */
export const DIAS_HEATMAP = ['Lun', '', 'Mié', '', 'Vie', '', ''];

export const FILTROS_SOLICITUD_DEMO: FiltroSolicitud[] = [
  { valor: 'todas', etiqueta: 'Todas 6' },
  { valor: 'pendientes', etiqueta: 'Pendientes 1' },
  { valor: 'aceptadas', etiqueta: 'Aceptadas 3' },
  { valor: 'rechazadas', etiqueta: 'Rechazadas 2' },
];

export const SOLICITUDES_DEMO: SolicitudGrupo[] = [
  {
    inicial: 'AC',
    grupo: 'Algorithms Club (UPC)',
    descripcion: 'Solicitud para unirse al grupo',
    fecha: '12 oct. 2024',
    estado: 'Pendiente',
  },
  {
    inicial: 'G',
    grupo: 'Competitive Programming UPC',
    descripcion: 'Solicitud para unirse al grupo',
    fecha: '8 oct. 2024',
    estado: 'Aceptada',
  },
  {
    inicial: 'LC',
    grupo: 'Latin Coders',
    descripcion: 'Solicitud para unirse al grupo',
    fecha: '3 oct. 2024',
    estado: 'Rechazada',
  },
  {
    inicial: 'P',
    grupo: 'Perú ICPC Team',
    descripcion: 'Solicitud para unirse al grupo',
    fecha: '28 sep. 2024',
    estado: 'Aceptada',
  },
  {
    inicial: 'SC',
    grupo: 'Sprint Coders',
    descripcion: 'Solicitud para unirse al grupo',
    fecha: '19 sep. 2024',
    estado: 'Aceptada',
  },
  {
    inicial: 'GR',
    grupo: 'Grafos y DP',
    descripcion: 'Solicitud para unirse al grupo',
    fecha: '2 sep. 2024',
    estado: 'Rechazada',
  },
];

export const SUBMISSIONS_DEMO: SubmissionPracticante[] = [
  {
    problema: 'Two Sum',
    lenguaje: 'C++',
    veredicto: 'Aceptado',
    tiempo: '15 ms',
    memoria: '8.2 MB',
    fecha: '12 oct. 2024',
  },
  {
    problema: 'Longest Increasing Subsequence',
    lenguaje: 'C++',
    veredicto: 'Aceptado',
    tiempo: '32 ms',
    memoria: '12.1 MB',
    fecha: '11 oct. 2024',
  },
  {
    problema: 'Minimum Spanning Tree',
    lenguaje: 'Python',
    veredicto: 'Wrong Answer',
    tiempo: '—',
    memoria: '—',
    fecha: '10 oct. 2024',
  },
  {
    problema: 'Coin Change',
    lenguaje: 'C++',
    veredicto: 'Aceptado',
    tiempo: '28 ms',
    memoria: '10.4 MB',
    fecha: '9 oct. 2024',
  },
  {
    problema: 'Dijkstra',
    lenguaje: 'C++',
    veredicto: 'Time Limit',
    tiempo: '—',
    memoria: '—',
    fecha: '8 oct. 2024',
  },
  {
    problema: 'Sort Colors',
    lenguaje: 'Python',
    veredicto: 'Aceptado',
    tiempo: '21 ms',
    memoria: '9.1 MB',
    fecha: '6 oct. 2024',
  },
  {
    problema: 'Binary Search',
    lenguaje: 'C++',
    veredicto: 'Aceptado',
    tiempo: '9 ms',
    memoria: '6.4 MB',
    fecha: '4 oct. 2024',
  },
  {
    problema: 'Knapsack 0/1',
    lenguaje: 'Java',
    veredicto: 'Wrong Answer',
    tiempo: '—',
    memoria: '—',
    fecha: '2 oct. 2024',
  },
];

export const PAGINAS_SUBMISSIONS_DEMO = ['1', '2', '3'];

export const VEREDICTOS_FILTRO: OpcionSelect[] = [
  { valor: 'todos', etiqueta: 'Todos los veredictos' },
  { valor: 'Aceptado', etiqueta: 'Aceptado' },
  { valor: 'Wrong Answer', etiqueta: 'Wrong Answer' },
  { valor: 'Time Limit', etiqueta: 'Time Limit' },
];

export const LENGUAJES_FILTRO: OpcionSelect[] = [
  { valor: 'todos', etiqueta: 'Todos los lenguajes' },
  { valor: 'C++', etiqueta: 'C++' },
  { valor: 'Python', etiqueta: 'Python' },
  { valor: 'Java', etiqueta: 'Java' },
];

export const PLATAFORMAS_FILTRO: OpcionSelect[] = [
  { valor: 'todas', etiqueta: 'Todas las plataformas' },
  { valor: 'Codeforces', etiqueta: 'Codeforces' },
  { valor: 'AtCoder', etiqueta: 'AtCoder' },
  { valor: 'VJudge', etiqueta: 'VJudge' },
];

export const PERIODOS_FILTRO: OpcionSelect[] = [{ valor: 'ultimo-anio', etiqueta: 'Último año' }];

export const PROBLEMAS_FILTRO: OpcionSelect[] = [
  { valor: 'todos', etiqueta: 'Todos los problemas' },
];

export const IDIOMAS_AJUSTES: OpcionSelect[] = [
  { valor: 'es_419', etiqueta: 'Español' },
  { valor: 'en_US', etiqueta: 'English' },
];

/** Demo recovery code shown in the "código de recuperación" dialog (example only). */
export const CODIGO_RECUPERACION_DEMO = 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX';

// ---- /perfil/editar -------------------------------------------------------------------

export const CARRERAS_EDICION = [
  'Ingeniería de Software',
  'Ciencias de la Computación',
  'Ingeniería de Sistemas de Información',
];

export const CICLOS_EDICION = [
  '1.º ciclo',
  '2.º ciclo',
  '3.º ciclo',
  '4.º ciclo',
  '5.º ciclo',
  '6.º ciclo',
  '7.º ciclo',
  '8.º ciclo',
  '9.º ciclo',
  '10.º ciclo',
];

export const DISTRITOS_EDICION = [
  'San Miguel',
  'Miraflores',
  'San Isidro',
  'Santiago de Surco',
  'Barranco',
  'Jesús María',
];

export const NIVELES_EDICION: OpcionEdicion[] = [
  {
    valor: 'PRINCIPIANTE',
    titulo: 'Principiante',
    descripcion: 'Estoy empezando en programación competitiva',
    icono: 'images/onboarding/level-1-24.svg',
  },
  {
    valor: 'INTERMEDIO',
    titulo: 'Intermedio',
    descripcion: 'Resuelvo problemas medios con regularidad',
    icono: 'images/onboarding/level-2-24.svg',
  },
  {
    valor: 'AVANZADO',
    titulo: 'Avanzado',
    descripcion: 'Participo en competencias y resuelvo problemas difíciles',
    icono: 'images/onboarding/level-3-24.svg',
  },
];

export const FRANJAS_EDICION = ['Mañana', 'Tarde', 'Noche'];
export const DIAS_EDICION = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const OBJETIVOS_EDICION = [
  'Clasificar a competencias',
  'Mejorar mi nivel',
  'Prepararme para entrevistas',
  'Aprender por diversión',
];

export const PLATAFORMAS_EDICION: PlataformaEdicion[] = [
  { control: 'codeforces', nombre: 'Codeforces', icono: 'images/onboarding/codeforces-34.svg' },
  { control: 'atcoder', nombre: 'AtCoder', icono: 'images/onboarding/atcoder-34.svg' },
  { control: 'vjudge', nombre: 'VJudge', icono: 'images/perfil/vjudge-34.svg' },
];

/** Same handles as the linked platforms shown in the profile. */
export const HANDLES_EDICION: Record<PlataformaEdicion['control'], string> = {
  codeforces: PLATAFORMAS_PERFIL_DEMO[0].usuario,
  atcoder: PLATAFORMAS_PERFIL_DEMO[1].usuario,
  vjudge: PLATAFORMAS_PERFIL_DEMO[2].usuario,
};
