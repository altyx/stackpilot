import { MASK, isSensitiveName, maskSensitiveLines } from './secrets';

describe('isSensitiveName', () => {
  it('flags the usual credential names, whatever the case', () => {
    for (const name of ['POSTGRES_PASSWORD', 'db_passwd', 'API_KEY', 'jwtSecret', 'AUTH_TOKEN']) {
      expect(isSensitiveName(name)).toBe(true);
    }
  });

  it('leaves ordinary names alone', () => {
    expect(isSensitiveName('POSTGRES_USER')).toBe(false);
    expect(isSensitiveName('TZ')).toBe(false);
  });
});

describe('maskSensitiveLines', () => {
  it('hides values in both Compose environment forms', () => {
    const { text, masked } = maskSensitiveLines(
      [
        'services:',
        '  db:',
        '    environment:',
        '      POSTGRES_USER: app',
        '      POSTGRES_PASSWORD: "hunter2"',
        '      - API_KEY=abc',
        '    secrets:',
        '      - source: db_password',
      ].join('\n'),
    );
    expect(masked).toBe(2);
    expect(text).toContain('POSTGRES_USER: app');
    expect(text).toContain(`POSTGRES_PASSWORD: ${MASK}`);
    expect(text).toContain(`- API_KEY=${MASK}`);
    expect(text).toContain('- source: db_password');
    expect(text).toContain('    secrets:');
  });

  it('returns the text untouched when nothing is sensitive', () => {
    expect(maskSensitiveLines('image: nginx')).toEqual({ text: 'image: nginx', masked: 0 });
  });
});
