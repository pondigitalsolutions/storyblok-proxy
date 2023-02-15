import { handleAllRequests } from '@/index';
import { JwtError, JwtGuard } from '@/guard';
import { MockAgent } from 'undici';

describe('Handlers', () => {
  it('should proxy all API requests', async () => {
    const bindings = getFilledMiniflareBindings();
    const fetchMock: MockAgent = getMiniflareFetchMock();
    fetchMock.disableNetConnect();

    // Monkey patch outgoing calls to prevent them.
    const canActivate = JwtGuard.prototype.canActivate;
    JwtGuard.prototype.canActivate = (): Promise<JwtError | null> => {
      return Promise.resolve(null);
    };
    const res = await handleAllRequests(
      new Request('http://localhost/add-user', {
        method: 'POST',
        body: JSON.stringify({
          firstname: 'doe',
          lastname: 'da',
          email: 'koekjes2@eten.com',
          preferred_language: 'nl',
        }),
      }),
      bindings,
    );
    expect(res.status).toBe(200);
    JwtGuard.prototype.canActivate = canActivate;
  });
});

export function getFilledMiniflareBindings() {
  const bindings = getMiniflareBindings();
  bindings.STORYBLOK_APIKEY = '1234';

  return bindings;
}
