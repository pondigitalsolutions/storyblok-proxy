import { OriginToken } from '@/index';

const defaultAllowed = 'GET, HEAD, POST, OPTIONS';
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': defaultAllowed,
  'access-control-max-age': '86400',
};

export async function handleOptions(
  request: Request,
  bindings: Bindings,
): Promise<Response> {
  const origin = request.headers.get('origin');
  const accessMethod = request.headers.get('access-control-request-method');
  const requestHeaders = request.headers.get('access-control-request-headers');
  if (origin !== null && accessMethod !== null && requestHeaders !== null) {
    // Handle CORS preflight requests.
    const allowHeaders = requestHeaders || defaultAllowed;
    const token = getTokenFromOrigin(origin, bindings);
    if (token instanceof Error) {
      return new Response(`Origin not allowed ${origin}`, { status: 403 });
    }

    return new Response(null, {
      headers: {
        ...corsHeaders,
        'access-control-allow-origin': origin,
        'access-control-allow-headers': allowHeaders,
      },
    });
  }

  // Handle standard OPTIONS request.
  return new Response(null, {
    headers: {
      Allow: defaultAllowed,
    },
  });
}

export function getTokenFromOrigin(
  origin: string,
  bindings: Bindings,
): string | Error {
  try {
    const tokenMap: OriginToken[] = JSON.parse(
      bindings.STORYBLOK_ORIGIN_TOKENS,
    );
    const tokens = tokenMap.filter((item) => origin.match(item.regex));
    if (tokens[0]) {
      return tokens[0].token;
    }
    if (tokens.length > 1) {
      return new Error(
        `Too many matching origins in STORYBLOK_ORIGIN_TOKENS config with origin ${origin}`,
      );
    }
    return new Error(`No token found for origin ${origin}`);
  } catch (err: any) {
    throw new Error(
      `Incorrect configuration in STORYBLOK_ORIGIN_TOKENS error: ${err.message}`,
    );
  }
}
