import { MembershipStatus } from '../../../core/teams-api';
import { segmentoCoach, segmentoPracticante, tabDesdeParametro } from './segmentos';

describe('Segmentos de Mis grupos', () => {
  it('agrupa las membresías del practicante por estado', () => {
    const esperado: Record<MembershipStatus, string> = {
      ACTIVO: 'activos',
      PENDIENTE: 'pendientes',
      ACLARACION_SOLICITADA: 'pendientes',
      RECHAZADO: 'historial',
      EXPULSADO: 'historial',
      RETIRADO: 'historial',
    };
    for (const [status, segmento] of Object.entries(esperado)) {
      expect(segmentoPracticante(status as MembershipStatus), status).toBe(segmento);
    }
  });

  it('separa los borradores del coach de los grupos publicados', () => {
    expect(segmentoCoach('BORRADOR')).toBe('borradores');
    expect(segmentoCoach('ACTIVO')).toBe('publicados');
    expect(segmentoCoach('ARCHIVADO')).toBe('publicados');
  });

  it('refleja la pestaña en el parámetro tab y cae en Explorar por defecto', () => {
    expect(tabDesdeParametro('mis-grupos')).toBe('mis-grupos');
    expect(tabDesdeParametro(null)).toBe('explorar');
    expect(tabDesdeParametro('otra-cosa')).toBe('explorar');
  });
});
