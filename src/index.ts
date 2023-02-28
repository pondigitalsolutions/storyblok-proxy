import { guard } from '@/guard';
import { sentry } from '@/sentry';
import { getTokenFromOrigin, handleOptions } from '@/options';

/**
 * Used as config structure to match Origin header regex to StoryBlok token.
 */
export interface OriginToken {
  regex: string;
  token: string;
}

/**
 * Main requests handler that routes OPTIONS requests, errors or StoryBlok API requests.
 */
export async function handleAllRequests(
  request: Request,
  bindings: Bindings,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    if (request.method === 'OPTIONS') {
      return handleOptions(request, bindings);
    }
    return guard(request, bindings, handleApiRequests);
  } catch (err: unknown) {
    return sentry(request, bindings, ctx, err);
  }
}

/**
 * Proxies requests to StoryBlok if possible.
 */
async function handleApiRequests(
  request: Request,
  bindings: Bindings,
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (!origin) {
    return new Response('Origin header is required', { status: 400 });
  }
  const token = getTokenFromOrigin(origin, bindings);
  if (token instanceof Error) {
    return new Response(`${token.message}`, { status: 400 });
  }

  // Set Storyblok token based on Origin.
  url.searchParams.set('token', token);
  // Remove leading and trailing slashes of the pathname for cleanliness.
  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  const query = url.searchParams.toString();
  const fullPath = `${bindings.STORYBLOK_HOST}/${path}?${query}`;

  // Remove Okta auth token but leave other headers for StoryBlok.
  const newHeaders = new Headers(request.headers);
  newHeaders.delete('authorization');
  const options: RequestInit = {
    method: request.method,
    headers: newHeaders,
  };
  // Copy the body data to StoryBlok if available.
  if (request.body) {
    options.body = await request.text();
  }

  console.log(`PROXY ${options.method} ${fullPath}`);

  return fetch(fullPath, options);
}

/**
 * Main entrypoint for the Cloudflare worker
 */
const worker: ExportedHandler<Bindings> = {
  fetch: handleAllRequests,
};
export default worker;
