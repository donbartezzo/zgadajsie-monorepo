import { IsSafeSocialUrlConstraint } from './social-url.validator';

describe('IsSafeSocialUrlConstraint', () => {
  const constraint = new IsSafeSocialUrlConstraint();

  it('akceptuje URL https', () => {
    expect(constraint.validate('https://facebook.com/jan.kowalski')).toBe(true);
  });

  it('akceptuje URL http', () => {
    expect(constraint.validate('http://example.com/profil')).toBe(true);
  });

  it('odrzuca schemat javascript:', () => {
    expect(constraint.validate('javascript:alert(1)')).toBe(false);
  });

  it('odrzuca schemat data:', () => {
    expect(constraint.validate('data:text/html;base64,abcd')).toBe(false);
  });

  it('odrzuca schemat file:', () => {
    expect(constraint.validate('file:///etc/passwd')).toBe(false);
  });

  it('odrzuca pusty string', () => {
    expect(constraint.validate('')).toBe(false);
  });

  it('odrzuca string niebędący URL', () => {
    expect(constraint.validate('nie jest urlem')).toBe(false);
  });

  it('odrzuca wartość niebędącą stringiem', () => {
    expect(constraint.validate(123 as unknown)).toBe(false);
    expect(constraint.validate(null as unknown)).toBe(false);
  });
});
