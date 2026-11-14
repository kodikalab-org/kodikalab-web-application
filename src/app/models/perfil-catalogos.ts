import type { OpcionEdicion, OpcionSelect, PlataformaEdicion } from './perfil-practicante';

/** Catálogos de opciones de los formularios y ajustes de perfil. No contienen datos de usuarios. */

export const IDIOMAS_AJUSTES: OpcionSelect[] = [
  { valor: 'es_419', etiqueta: 'Español' },
  { valor: 'en_US', etiqueta: 'English' },
];

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

/** Icono de Codeforces para la lista de plataformas vinculadas del perfil. */
export const ICONO_CODEFORCES = 'images/onboarding/codeforces-34.svg';
