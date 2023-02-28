import { DecodedJwt, JwtParseResult } from '@cfworker/jwt/src/types';
import { parseJwt } from '@cfworker/jwt';

export type requestFn = (
  request: Request,
  bindings: Bindings,
) => Promise<Response>;
export type parseJwtFn = (
  encodedToken: string,
  issuer: string,
  audience: string,
  resolveKey?: (decoded: DecodedJwt) => Promise<CryptoKey | null>,
) => Promise<JwtParseResult>;

/**
 * Helper class to validate JWT tokens. Setup as a class for easier dependency injection
 * and testing of JWT tokens. The parseJwtFn is replaced with mock functions in tests.
 */
export class JwtGuard {
  constructor(
    private readonly bindings: Bindings,
    private readonly parseJwtFn: parseJwtFn,
  ) {}

  /**
   * Validates incoming request for authorization header JWT Bearer token.
   * Returns null if request is valid else a validation error.
   */
  async validateRequest(request: Request): Promise<JwtError | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new JwtError('Please provide token to access service', 403);
    }
    const auth = authHeader.split(' ');
    if (auth[0] !== 'Bearer') {
      return new JwtError('Provide valid Bearer token', 403);
    }

    const result = await this.parseJwtFn(
      auth[1],
      this.bindings.OKTA_ISSUER,
      this.bindings.OKTA_AUDIENCE,
    );
    if (!result.valid) {
      return new JwtError(`Token is invalid: ${result.reason}`, 403);
    }

    return null;
  }
}

export class JwtError extends Error {
  constructor(public error: string, public code: number) {
    super(`${error}: ${code}`);
  }
}

/**
 * Main method to test for valid JWT authenticated requests.
 */
export async function guard(
  request: Request,
  bindings: Bindings,
  handler: requestFn,
): Promise<Response> {
  const guard = new JwtGuard(bindings, parseJwt);
  const err = await guard.validateRequest(request);
  if (err instanceof JwtError) {
    console.error(`Request guarded with error: ${err.message}`);
    return new Response(err.message, { status: err.code });
  }

  return handler(request, bindings);
}
