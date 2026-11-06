import { profileIdentity } from './profile-identity';

describe('profileIdentity', () => {
  it('uses the full account name and keeps email separate', () => {
    expect(
      profileIdentity('  Ana  María  Núñez  ', 'student@example.invalid', 'Practicante'),
    ).toEqual({ name: 'Ana María Núñez', email: 'student@example.invalid', initials: 'AN' });
  });

  it('preserves Unicode initials and supports a one-word name', () => {
    expect(profileIdentity('Álvaro', 'student@example.invalid', 'Practicante').initials).toBe('Á');
    expect(profileIdentity('Érika Ortiz', 'student@example.invalid', 'Practicante').initials).toBe(
      'ÉO',
    );
  });

  it.each([undefined, null, '', '   '])(
    'does not derive an invented name from email when name is %s',
    (name) => {
      expect(profileIdentity(name, 'not.a.real.name@example.invalid', 'Practicante')).toEqual({
        name: 'Practicante',
        email: 'not.a.real.name@example.invalid',
        initials: 'KL',
      });
    },
  );
});
