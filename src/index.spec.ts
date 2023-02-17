import { handleAllRequests } from '@/index';
import { JwtError, JwtGuard } from '@/guard';
import { MockInterceptor } from 'undici/types/mock-interceptor';

describe('handleAllRequests', () => {
  // Intercept all fetch requests with our own mock responses.
  const bindings = getFilledMiniflareBindings();
  const hostUrl = new URL(bindings.STORYBLOK_HOST);
  const fetchMock = getMiniflareFetchMock();
  fetchMock.disableNetConnect();
  const origin = fetchMock.get(hostUrl.origin);
  let body: any;
  origin
    .intercept({
      method: () => true,
      path: () => true,
    })
    .reply(200, (opts: MockInterceptor.MockResponseCallbackOptions) => {
      if (opts.body) {
        body = opts.body;
      }
      // Return information about Request that we can use in tests (https://undici.nodejs.org/#/docs/best-practices/mocking-request?id=reply-with-data-based-on-request)
      return {
        ...opts,
      };
    })
    .persist();
  const cases = [
    {
      name: 'Should POST with body',
      request: new Request('http://localhost/v1/cdn/stories', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer testtoken',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Heel veel stories instoppen',
        }),
      }),
      expectPath: '/v1/cdn/stories?token=1234',
      expectBody: {
        content: 'Heel veel stories instoppen',
      },
    },
    {
      name: 'Should GET v1',
      request: new Request('https://localhost/v1/cdn/stories', {
        method: 'GET',
        headers: { Authorization: 'Bearer testtoken' },
      }),
      expectPath: '/v1/cdn/stories?token=1234',
    },
    {
      name: 'Should GET v1 with params',
      request: new Request(
        'https://localhost/v1/cdn/stories/mindset/accessibility?version=draft&resolve_relations=page.pageCategory',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer testtoken' },
        },
      ),
      expectPath:
        '/v1/cdn/stories/mindset/accessibility?version=draft&resolve_relations=page.pageCategory&token=1234',
    },
    {
      name: 'Should GET v2 with params',
      request: new Request('https://localhost/v2/categories?version=draft', {
        method: 'GET',
        headers: { Authorization: 'Bearer testtoken' },
      }),
      expectPath: '/v2/categories?version=draft&token=1234',
    },
  ];

  it.each(cases)(
    'proxy request: $name = $expectPath',
    async ({ request, expectPath, expectBody }) => {
      // Monkey patch outgoing calls to prevent them.
      const canActivate = JwtGuard.prototype.canActivate;
      JwtGuard.prototype.canActivate = (): Promise<JwtError | null> => {
        return Promise.resolve(null);
      };
      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };
      const res = await handleAllRequests(request, bindings, ctx);
      const inspect =
        await res.json<MockInterceptor.MockResponseCallbackOptions>();
      if (body && expectBody) {
        for await (const item of body) {
          const actualBody = JSON.parse(new TextDecoder().decode(item));
          expect(actualBody).toEqual(expectBody);
        }
      }
      expect(res.status).toBe(200);
      expect(inspect.path).toEqual(expectPath);
      JwtGuard.prototype.canActivate = canActivate;
    },
  );
});

export function getFilledMiniflareBindings() {
  const bindings = getMiniflareBindings();
  bindings.STORYBLOK_HOST = 'http://localhost';
  bindings.STORYBLOK_TOKEN = '1234';

  return bindings as Bindings;
}
