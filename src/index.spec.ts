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
  origin
    .intercept({
      method: () => true,
      path: () => true,
    })
    .reply(200, (opts) => {
      // Return information about Request that we can use in tests (https://undici.nodejs.org/#/docs/best-practices/mocking-request?id=reply-with-data-based-on-request)
      return {
        ...opts,
      };
    })
    .persist();
  const defaultHeaders = {
    Origin: 'https://localhost:3000',
    Authorization: 'Bearer testtoken',
    'Content-Type': 'application/json',
  };
  const cases = [
    {
      name: 'Should allow OPTIONS request for CORS',
      request: new Request('http://localhost/v1/cnd/stories', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers':
            'authorization,baggage,content-type,sentry-trace',
        },
      }),
    },
    {
      name: 'Should POST with body',
      request: new Request('http://localhost/v1/cdn/stories', {
        method: 'POST',
        headers: defaultHeaders,
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
        headers: defaultHeaders,
      }),
      expectPath: '/v1/cdn/stories?token=1234',
    },
    {
      name: 'Should GET v1 with params',
      request: new Request(
        'https://localhost/v1/cdn/stories/mindset/accessibility?version=draft&resolve_relations=page.pageCategory',
        {
          method: 'GET',
          headers: defaultHeaders,
        },
      ),
      expectPath:
        '/v1/cdn/stories/mindset/accessibility?version=draft&resolve_relations=page.pageCategory&token=1234',
    },
    {
      name: 'Should GET v2 with params',
      request: new Request('https://localhost/v2/categories?version=draft', {
        method: 'GET',
        headers: defaultHeaders,
      }),
      expectPath: '/v2/categories?version=draft&token=1234',
    },
    {
      name: 'Should expect Origin header',
      request: new Request('https://localhost/v2/stories', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer testtoken',
        },
      }),
      expectStatus: 400,
    },
    {
      name: 'Should have matching Origin header',
      request: new Request('https://localhost/v2/stories', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer testtoken',
          Origin: 'https://nowallowedomain.com',
        },
      }),
      expectStatus: 400,
    },
  ];

  it.each(cases)(
    'proxy request: $name = $expectPath',
    async ({ request, expectPath, expectBody, expectStatus }) => {
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
      if (expectStatus) {
        expect(res.status).toBe(expectStatus);
      }

      if (expectPath || expectBody) {
        const inspect =
          await res.json<MockInterceptor.MockResponseCallbackOptions>();
        if (expectBody && typeof inspect.body === 'string') {
          expect(JSON.parse(inspect.body)).toEqual(expectBody);
        }
        if (expectPath) {
          expect(inspect.path).toEqual(expectPath);
        }
        expect(res.status).toBe(200);
      }

      JwtGuard.prototype.canActivate = canActivate;
    },
  );
});

export function getFilledMiniflareBindings() {
  const bindings = getMiniflareBindings();
  bindings.STORYBLOK_HOST = 'http://localhost';
  bindings.STORYBLOK_ORIGIN_TOKENS =
    '[{"token":"1234","regex":"^.+localhost:3000.*$"}]';

  return bindings as Bindings;
}
