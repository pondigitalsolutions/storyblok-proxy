import { captureError } from '@cfworker/sentry';

export async function sentry(
  request: Request,
  bindings: Bindings,
  ctx: ExecutionContext,
  err: unknown | Error,
  user = {},
): Promise<Response> {
  const { event_id, posted } = captureError(
    bindings.SENTRY_DSN,
    bindings.ENVIRONMENT,
    bindings.VERSION,
    err,
    request,
    user,
  );
  ctx.waitUntil(posted);

  return new Response(`Internal server error: Event id: ${event_id}`, {
    status: 500,
  });
}
