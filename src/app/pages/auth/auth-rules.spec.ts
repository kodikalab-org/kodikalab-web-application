import { FormControl, FormGroup } from '@angular/forms';
import {
  emailRule, formatRecoveryCode, fullNameRule, isWeakPassword, nameRule, normalizeEmail, normalizeName,
  normalizeRecoveryCode, passwordBytesRule, passwordPolicyRule, recoveryCodeRule, roleRule, utf8ByteLength,
} from './auth-rules';

const control = (value: string) => new FormControl(value, { nonNullable: true });

describe('auth rules', () => {
  describe('names', () => {
    it('treats whitespace-only names as missing', () => {
      expect(nameRule(control('   '))).toEqual({ required: true });
    });

    it('accepts 80 characters and rejects 81 after trimming', () => {
      expect(nameRule(control(`  ${'a'.repeat(80)}  `))).toBeNull();
      expect(nameRule(control('a'.repeat(81)))).toEqual({ maxlength: { requiredLength: 80, actualLength: 81 } });
    });

    it('collapses internal whitespace when normalizing', () => {
      expect(normalizeName('  Ana   María \t')).toBe('Ana María');
    });

    it('rejects a full name above 150 characters, measured after normalization', () => {
      const group = new FormGroup({ firstName: control('a'.repeat(80)), lastName: control('b'.repeat(69)) });
      expect(fullNameRule(group)).toBeNull();
      group.controls.lastName.setValue('b'.repeat(70));
      expect(fullNameRule(group)).toEqual({ fullNameTooLong: true });
      group.controls.lastName.setValue(`   ${'b'.repeat(69)}   `);
      expect(fullNameRule(group)).toBeNull();
    });

    it('does not report the full name until both parts exist', () => {
      const group = new FormGroup({ firstName: control('a'.repeat(80)), lastName: control('') });
      expect(fullNameRule(group)).toBeNull();
    });
  });

  describe('email', () => {
    it('requires a value and a valid format after trimming', () => {
      expect(emailRule(control('  '))).toEqual({ required: true });
      expect(emailRule(control('  camila.rojas@upc.edu.pe  '))).toBeNull();
      expect(emailRule(control('camila.rojas@'))).toEqual({ email: true });
    });

    it('limits the email to 100 characters', () => {
      const local = 'a'.repeat(60);
      const domain = `${'b'.repeat(30)}.${'c'.repeat(20)}.pe`;
      const email = `${local}@${domain}`;
      expect(email.length).toBeGreaterThan(100);
      expect(emailRule(control(email))).toEqual({ maxlength: { requiredLength: 100, actualLength: email.length } });
    });

    it('lowercases and trims before sending', () => {
      expect(normalizeEmail('  Camila.Rojas@UPC.edu.PE ')).toBe('camila.rojas@upc.edu.pe');
    });
  });

  describe('password strength', () => {
    it('reports an empty value as required, not as weak', () => {
      expect(passwordPolicyRule(control(''))).toEqual({ required: true });
    });

    it('rejects "12345" as weak', () => {
      expect(passwordPolicyRule(control('12345'))).toEqual({ weakPassword: true });
    });

    it('needs at least 8 characters, one uppercase letter and one digit', () => {
      expect(passwordPolicyRule(control('Abcdef1'))).toEqual({ weakPassword: true });
      expect(passwordPolicyRule(control('abcdefg1'))).toEqual({ weakPassword: true });
      expect(passwordPolicyRule(control('ABCDEFG1'))).toBeNull();
      expect(passwordPolicyRule(control('Abcdefgh'))).toEqual({ weakPassword: true });
      expect(passwordPolicyRule(control('Abcdefg1'))).toBeNull();
    });

    it('accepts Unicode uppercase letters and digits like the backend pattern', () => {
      expect(passwordPolicyRule(control('Ñandú2026'))).toBeNull();
      expect(passwordPolicyRule(control('ñandúÑ1234'))).toBeNull();
      expect(passwordPolicyRule(control('Abcdefg٣'))).toBeNull();
      expect(passwordPolicyRule(control('ñandú2026'))).toEqual({ weakPassword: true });
    });

    it('counts the minimum length in code points, not UTF-16 units', () => {
      expect(passwordPolicyRule(control('A😀😀😀😀😀😀1'))).toBeNull();
      expect(passwordPolicyRule(control('A😀😀😀😀😀1'))).toEqual({ weakPassword: true });
    });

    it('marks a weak password for orange only after it is touched and has a value', () => {
      const field = control('12345');
      expect(isWeakPassword(field)).toBe(false);
      field.setErrors(passwordPolicyRule(field));
      field.markAsTouched();
      expect(isWeakPassword(field)).toBe(true);
      field.setValue('');
      expect(isWeakPassword(field)).toBe(false);
    });
  });

  describe('password bytes', () => {
    it('measures UTF-8 bytes, not characters', () => {
      expect(utf8ByteLength('ñ')).toBe(2);
      expect(utf8ByteLength('€')).toBe(3);
    });

    it('accepts 72 bytes and rejects 73 without truncating', () => {
      expect(passwordBytesRule(control('a'.repeat(72)))).toBeNull();
      expect(passwordBytesRule(control('a'.repeat(73)))).toEqual({ passwordTooLong: { max: 72, actual: 73 } });
    });

    it('counts multibyte characters towards the 72-byte limit', () => {
      // 36 euro signs = 108 bytes but only 36 characters.
      expect(passwordBytesRule(control('€'.repeat(36)))).toEqual({ passwordTooLong: { max: 72, actual: 108 } });
      // 24 euro signs = 72 bytes exactly.
      expect(passwordBytesRule(control('€'.repeat(24)))).toBeNull();
    });
  });

  describe('recovery code', () => {
    it('normalizes case, spaces and hyphens, then formats it canonically', () => {
      const normalized = normalizeRecoveryCode(' abcd efgh-ijkl mnop qrst-uvwx ');
      expect(normalized).toBe('ABCDEFGHIJKLMNOPQRSTUVWX');
      expect(formatRecoveryCode(normalized)).toBe('ABCD-EFGH-IJKL-MNOP-QRST-UVWX');
    });

    it('accepts the code with or without hyphens', () => {
      expect(recoveryCodeRule(control('ABCD-EFGH-IJKL-MNOP-QRST-UVWX'))).toBeNull();
      expect(recoveryCodeRule(control('abcdefghijklmnopqrstuvwx'))).toBeNull();
    });

    it('requires 24 Base32 characters (A-Z and 2-7)', () => {
      expect(recoveryCodeRule(control(''))).toEqual({ required: true });
      expect(recoveryCodeRule(control('ABCD-EFGH-IJKL-MNOP-QRST-UVW'))).toEqual({ recoveryCodeFormat: true });
      expect(recoveryCodeRule(control('ABCD-EFGH-IJKL-MNOP-QRST-UVWXY'))).toEqual({ recoveryCodeFormat: true });
      expect(recoveryCodeRule(control('ABCD-EFGH-IJKL-MNOP-QRST-UVW0'))).toEqual({ recoveryCodeFormat: true });
      expect(recoveryCodeRule(control('ABCD-EFGH-IJKL-MNOP-QRST-UVW1'))).toEqual({ recoveryCodeFormat: true });
      expect(recoveryCodeRule(control('invalid-code'))).toEqual({ recoveryCodeFormat: true });
    });
  });

  it('only allows the two roles of the contract', () => {
    expect(roleRule(control('PRACTICANTE'))).toBeNull();
    expect(roleRule(control('COACH'))).toBeNull();
    expect(roleRule(control('ADMIN'))).toEqual({ role: true });
  });
});
