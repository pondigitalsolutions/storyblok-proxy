import { guard } from '@/guard';
import { sentry } from '@/sentry';
import { getTokenFromOrigin, handleOptions } from '@/options';

export interface OriginToken {
  regex: string;
  token: string;
}

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
  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  const fullPath = `${
    bindings.STORYBLOK_HOST
  }/${path}?${url.searchParams.toString()}`;

  // Remove Okta auth token but leave other headers for StoryBlok.
  const newHeaders = new Headers(request.headers);
  newHeaders.delete('authorization');
  const options: RequestInit = {
    method: request.method,
    headers: newHeaders,
  };
  if (request.body) {
    options.body = await request.text();
  }

  console.log(`PROXY ${options.method} ${fullPath}`);

  return fetch(fullPath, options);
}

const worker: ExportedHandler<Bindings> = {
  fetch: handleAllRequests,
};

export default worker;
