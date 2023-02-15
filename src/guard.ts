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

export class JwtGuard {
  constructor(
    private readonly bindings: Bindings,
    private readonly parseJwtFn: parseJwtFn,
  ) {}

  async canActivate(request: Request): Promise<JwtError | null> {
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

export async function guard(
  request: Request,
  bindings: Bindings,
  handler: requestFn,
): Promise<Response> {
  const guard = new JwtGuard(bindings, parseJwt);
  const allowed = await guard.canActivate(request);
  if (allowed instanceof JwtError) {
    console.error(`Request guarded with error: ${allowed.message}`);
    return new Response(allowed.message, { status: allowed.code });
  }

  return handler(request, bindings);
}
