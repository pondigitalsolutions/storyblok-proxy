import { guard } from '@/guard';
import { sentry } from '@/sentry';

export async function handleAllRequests(
  request: Request,
  bindings: Bindings,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
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
  const newHeaders = new Headers(request.headers);
  // Remove Okta auth token but leave other headers.
  newHeaders.delete('Authorization');
  // Set Storyblok token.
  url.searchParams.set('token', bindings.STORYBLOK_TOKEN);
  const fullPath = `${bindings.STORYBLOK_HOST}/${url.pathname.replace(
    /^\/+|\/+$/g,
    '',
  )}?${url.searchParams.toString()}`;
  const options: RequestInit = {
    method: request.method,
    headers: newHeaders,
  };
  if (request.body) {
    options.body = await request.text();
  }

  return fetch(fullPath, options);
}

const worker: ExportedHandler<Bindings> = {
  fetch: handleAllRequests,
};

export default worker;
