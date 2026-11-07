import {
  durationMinutes, formatCountdown, formatDuration, formatSolveTime, penaltyLabel, registrationMessage,
  standingCellText,
} from './concursos-model';

describe('concursos model helpers', () => {
  it('formats countdowns coarsely far away and precisely near the date', () => {
    expect(formatCountdown(26 * 3_600_000)).toBe('1 d 2 h');
    expect(formatCountdown(3 * 3_600_000 + 20 * 60_000)).toBe('3 h 20 min');
    expect(formatCountdown(12 * 60_000 + 5_000, true)).toBe('12 min 05 s');
    expect(formatCountdown(-1)).toBe('0 min');
  });

  it('derives and formats the duration from the start and end dates', () => {
    expect(durationMinutes('2026-01-01T10:00:00Z', '2026-01-01T12:30:00Z')).toBe(150);
    expect(durationMinutes(null, '2026-01-01T12:30:00Z')).toBeNull();
    expect(formatDuration(150)).toBe('2 h 30 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(null)).toBe('—');
  });

  it('labels the penalty rules', () => {
    expect(penaltyLabel('ICPC_20_MIN')).toBe('ICPC (20 min por envío incorrecto)');
    expect(penaltyLabel('IOI_POINTS')).toBe('IOI (puntos)');
    expect(penaltyLabel(undefined)).toBe('—');
  });

  it('renders standings cells the Codeforces way', () => {
    expect(standingCellText({ result: 'RESUELTO', attempts: 1 })).toBe('+');
    expect(standingCellText({ result: 'RESUELTO', attempts: 3 })).toBe('+2');
    expect(standingCellText({ result: 'EN_PROGRESO', attempts: 3 })).toBe('-3');
    expect(standingCellText({ result: 'PENDIENTE', attempts: 1 })).toBe('?');
    expect(standingCellText({ result: 'SIN_INTENTOS', attempts: 0 })).toBe('');
    expect(formatSolveTime(85)).toBe('1:25');
  });

  it('derives the post-registration message from the resulting status of the problem', () => {
    expect(registrationMessage('A', 'RESUELTO')).toBe('Envío registrado: el problema A quedó como resuelto.');
    expect(registrationMessage('B', 'PENDIENTE')).toBe(
      'Envío registrado para el problema B. Quedó pendiente de verificación.',
    );
    expect(registrationMessage('C', 'EN_PROGRESO')).toBe('Envío registrado para el problema C.');
    expect(registrationMessage('D', 'SIN_INTENTOS')).toBe('Envío registrado para el problema D.');
    expect(registrationMessage('D', null)).toBe('Envío registrado para el problema D.');
  });
});
