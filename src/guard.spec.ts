import { JwtError, JwtGuard } from '@/guard';
import { DecodedJwt, JwtParseResult } from '@cfworker/jwt/src/types';

describe('Guard', () => {
  const defaultUrl = 'https://unittest.local/testpath';
  const defaultParseFn = jest.fn();
  it('should find authorization header', async () => {
    const env = getMiniflareBindings() as Bindings;
    const guard = new JwtGuard(env, defaultParseFn);
    const request = new Request(defaultUrl);
    const actual = await guard.canActivate(request);
    expect(actual).toBeInstanceOf(JwtError);
    if (actual instanceof JwtError) {
      expect(actual.message).toBe(
        'Please provide token to access service: 403',
      );
    }
  });

  it('should have a bearer token', async () => {
    const env = getMiniflareBindings() as Bindings;
    const guard = new JwtGuard(env, defaultParseFn);
    const headers = new Headers();
    headers.set('authorization', 'simsalabim');
    const request = new Request(defaultUrl, {
      headers: headers,
    });
    const actual = await guard.canActivate(request);
    expect(actual).toBeInstanceOf(JwtError);
    if (actual instanceof JwtError) {
      expect(actual.message).toBe('Provide valid Bearer token: 403');
    }
  });

  it('should fail the parser', async () => {
    const env = getMiniflareBindings() as Bindings;
    const parseFn = (): Promise<JwtParseResult> => {
      return Promise.resolve({
        valid: false,
        reason: 'unit test',
      });
    };
    const guard = new JwtGuard(env, parseFn);
    const headers = new Headers();
    headers.set('authorization', 'Bearer testing testing');
    const request = new Request(defaultUrl, {
      headers: headers,
    });
    const actual = await guard.canActivate(request);
    expect(actual).toBeInstanceOf(JwtError);
    if (actual instanceof JwtError) {
      expect(actual.message).toBe('Token is invalid: unit test: 403');
    }
  });

  it('should activate', async () => {
    const env = getMiniflareBindings() as Bindings;
    const parseFn = (
      encodedToken: string,
      issuer: string,
      audience: string,
      resolveKey?: (decoded: DecodedJwt) => Promise<CryptoKey | null>,
    ): Promise<JwtParseResult> => {
      return Promise.resolve({
        valid: true,
        payload: {
          iss: `bla ${resolveKey}`,
          sub: 'bloe@test.com',
          aud: audience,
          iat: 100,
          exp: 101,
        },
      });
    };
    const guard = new JwtGuard(env, parseFn);
    const headers = new Headers();
    headers.set('authorization', 'Bearer AllGood');
    const request = new Request(defaultUrl, {
      headers: headers,
    });
    const actual = await guard.canActivate(request);
    expect(actual).toEqual(null);
  });
});
