import { GroupStatus, MembershipStatus } from '../../../core/teams-api';

/** Gradients for the group avatar, picked by position so every card keeps its colour. */
export const TONOS = [
  'from-[#7000ff] to-[#af6dff]',
  'from-[#00a9a4] to-[#54e4cd]',
  'from-[#2360e8] to-[#60a5fa]',
  'from-[#a020dc] to-[#e7a5f9]',
  'from-[#bf125d] to-[#f44d91]',
  'from-[#078b3e] to-[#54d884]',
];

const NIVELES: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  Div3: 'Div3',
  Div2: 'Div2',
  Regional: 'Regional',
};

export function nivelTexto(nivel: string | null): string {
  return NIVELES[nivel ?? ''] ?? (nivel || 'Sin definir');
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? '')
    .join('');
}

const BADGE_AMBAR = 'border-amber-300/50 bg-amber-300/10 text-amber-300';
const BADGE_ACENTO = 'border-kl-accent/50 bg-kl-accent/10 text-kl-accent-text';
const BADGE_ROJO = 'border-red-400/50 bg-red-400/10 text-red-300';
const BADGE_VERDE = 'border-green-400/50 bg-green-400/10 text-green-400';
const BADGE_GRIS = 'border-kl-border-strong bg-white/5 text-kl-body';

export function etiquetaMembresia(status: MembershipStatus): string {
  switch (status) {
    case 'ACTIVO':
      return 'Miembro activo';
    case 'PENDIENTE':
      return 'Solicitud pendiente';
    case 'ACLARACION_SOLICITADA':
      return 'Aclaración solicitada';
    case 'RECHAZADO':
      return 'Solicitud rechazada';
    case 'EXPULSADO':
      return 'Expulsado';
    case 'RETIRADO':
      return 'Retirado';
  }
}

export function claseMembresia(status: MembershipStatus): string {
  switch (status) {
    case 'ACTIVO':
      return BADGE_ACENTO;
    case 'PENDIENTE':
    case 'ACLARACION_SOLICITADA':
      return BADGE_AMBAR;
    case 'EXPULSADO':
    case 'RECHAZADO':
      return BADGE_ROJO;
    case 'RETIRADO':
      return BADGE_GRIS;
  }
}

export function etiquetaGrupo(status: GroupStatus): string {
  switch (status) {
    case 'BORRADOR':
      return 'Borrador';
    case 'ARCHIVADO':
      return 'Archivado';
    case 'ACTIVO':
      return 'Publicado';
  }
}

export function claseGrupo(status: GroupStatus): string {
  switch (status) {
    case 'BORRADOR':
      return BADGE_AMBAR;
    case 'ARCHIVADO':
      return BADGE_GRIS;
    case 'ACTIVO':
      return BADGE_VERDE;
  }
}
