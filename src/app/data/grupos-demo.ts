import type { CoachGroup, Membership, PractitionerGroup, StudyGroupSummary } from '../core/teams-api';

// Datos estáticos del recorrido de interfaces; nunca representan respuestas del servidor.
export const GRUPOS_DEMO: StudyGroupSummary[] = [
  { groupId: 1, name: 'Equipo Alfa', description: 'Entrenamiento de grafos y programación dinámica.', expectedLevel: 'INTERMEDIO', maxCapacity: 20, sessionSchedule: 'Mar y jue de 19:00 a 21:00', status: 'ACTIVO', visibility: 'PUBLICO' },
  { groupId: 2, name: 'Training ICPC UPC', description: 'Preparación para competencias por equipos.', expectedLevel: 'AVANZADO', maxCapacity: 15, sessionSchedule: 'Sábados de 15:00 a 18:00', status: 'ACTIVO', visibility: 'PROTEGIDO' },
];
export const GRUPOS_COACH_DEMO: CoachGroup[] = GRUPOS_DEMO.map(group => ({
  ...group, invitationCode: 'DEMO12345678', activeMembers: 3, pendingRequests: 1,
}));
export const MEMBRESIAS_DEMO: PractitionerGroup[] = [{
  ...GRUPOS_DEMO[0], membership: { membershipId: 1, status: 'ACTIVO', teamRole: 'MIEMBRO', joinedAt: '2026-10-01T18:00:00Z', leftAt: null },
}];
export const SOLICITUDES_GRUPO_DEMO: Membership[] = [{
  membershipId: 101, groupId: 1, status: 'PENDIENTE', requestedAt: '2026-10-12T18:00:00Z',
  practitioner: { fullName: 'Valeria Núñez', studentCode: 'U2020001', career: 'Ingeniería de Software', academicCycle: 5, competitiveLevel: 'INTERMEDIO', codeforcesHandle: 'valeria_cf', codeforcesRating: 1432, atcoderHandle: null, vjudgeHandle: null },
}];
