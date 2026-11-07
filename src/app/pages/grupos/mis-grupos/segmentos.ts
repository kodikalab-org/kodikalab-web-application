import { GroupStatus, MembershipStatus } from '../../../core/teams-api';

export type TabGrupos = 'explorar' | 'mis-grupos';
export type SegmentoPracticante = 'activos' | 'pendientes' | 'historial';
export type SegmentoCoach = 'publicados' | 'borradores';

/** The tab lives in `?tab=`; anything unknown falls back to Explorar. */
export function tabDesdeParametro(valor: string | null): TabGrupos {
  return valor === 'mis-grupos' ? 'mis-grupos' : 'explorar';
}

export function segmentoPracticante(status: MembershipStatus): SegmentoPracticante {
  switch (status) {
    case 'ACTIVO':
      return 'activos';
    case 'PENDIENTE':
    case 'ACLARACION_SOLICITADA':
      return 'pendientes';
    default:
      return 'historial';
  }
}

export function segmentoCoach(status: GroupStatus): SegmentoCoach {
  return status === 'BORRADOR' ? 'borradores' : 'publicados';
}
