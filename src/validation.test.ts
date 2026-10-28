import { describe, expect, it } from 'vitest';
import { validateProfile } from './validation';
describe('profile input boundaries', () => {
 it('accepts a valid profile with optional fields empty',()=>expect(validateProfile('Maria','',[])).toBeNull());
 it('rejects whitespace-only names',()=>expect(validateProfile('  ','',[])).toBeTruthy());
 it('rejects names longer than 60 characters',()=>expect(validateProfile('a'.repeat(61),'',[])).toBeTruthy());
 it('rejects oversized bios',()=>expect(validateProfile('Maria','a'.repeat(301),[])).toBeTruthy());
 it('rejects more than ten interests',()=>expect(validateProfile('Maria','',Array(11).fill('Games'))).toBeTruthy());
 it('rejects oversized interest labels',()=>expect(validateProfile('Maria','',['a'.repeat(31)])).toBeTruthy());
 it('accepts maximum field lengths',()=>expect(validateProfile('a'.repeat(60),'b'.repeat(300),Array(10).fill('c'.repeat(30)))).toBeNull());
});
