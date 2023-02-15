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
  return new Response('ok');
}

const worker: ExportedHandler<Bindings> = {
  fetch: handleAllRequests,
};

export default worker;
