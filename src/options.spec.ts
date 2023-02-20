import { handleOptions } from '@/options';

describe('Should handle OPTIONS request', () => {
  const defaultUrl = 'http://localhost';
  const defaultBindings = {
    OKTA_AUDIENCE: 'weoigj35t945df',
    OKTA_ISSUER: 'https://okta.com',
    OKTA_CLIENTID: 'someId',
    STORYBLOK_HOST: 'https://api.storyblok.com',
    STORYBLOK_ORIGIN_TOKENS:
      '[{"token":"Qiu4cDrlCcQaKrxDSinPkwtt","regex":"^.+localhost:3000.*$"}]',
    SENTRY_DSN: 'https://sentry.io',
    ENVIRONMENT: 'development',
    VERSION: 'v0.0.0',
  };
  const cases = [
    {
      name: 'Default request as no allowed origin headers',
      request: new Request(defaultUrl, {
        method: 'OPTIONS',
      }),
      expectHeaders: new Headers({
        allow: 'GET, HEAD, POST, OPTIONS',
      }),
      expectStatus: 200,
    },
    {
      name: 'Origin not allowed',
      request: new Request(defaultUrl, {
        method: 'OPTIONS',
        headers: {
          origin: 'https://malicioussite.com',
          'access-control-request-method': 'GET',
          'access-control-request-headers':
            'authorization,baggage,content-type,sentry-trace',
        },
      }),
      expectStatus: 403,
    },
    {
      name: 'Origin Allowed',
      request: new Request(defaultUrl, {
        method: 'OPTIONS',
        headers: {
          origin: 'https://localhost:3000',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'authorization,x-vendor',
        },
      }),
      expectHeaders: new Headers({
        'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
        'access-control-max-age': '86400',
        'access-control-allow-origin': 'https://localhost:3000',
        'access-control-allow-headers': 'authorization,x-vendor',
      }),
      expectStatus: 200,
    },
  ];

  it.each(cases)(
    'case $name',
    async ({ request, expectHeaders, expectStatus }) => {
      const res = await handleOptions(request, defaultBindings);
      if (expectHeaders) {
        expect(res.headers).toEqual(expectHeaders);
      }
      if (expectStatus) {
        expect(res.status).toEqual(expectStatus);
      }
    },
  );
});
