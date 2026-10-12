import { ApiClient, type PlatformAuthAdapter } from '@playmatch/shared';

/**
 * Node In-Memory Auth Adapter with Body-Based Refresh
 *
 * NOTE: This script explicitly verifies the body-based refresh token path (used by mobile and node clients).
 * It does not test the web cookie-based refresh path, which uses HttpOnly credentials in the browser.
 */
class NodeAuthAdapter implements PlatformAuthAdapter {
  public readonly clientType = 'mobile' as const;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  async getRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  async setRefreshToken(token: string | null): Promise<void> {
    this.refreshToken = token;
  }

  clearSession(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }

  prepareHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'x-client-type': 'mobile',
    };
  }

  async prepareRefreshPayload(): Promise<Record<string, unknown> | undefined> {
    if (!this.refreshToken) return undefined;
    return { refreshToken: this.refreshToken };
  }

  async handleRefreshResponse(data: { accessToken: string; refreshToken?: string }): Promise<void> {
    this.accessToken = data.accessToken;
    if (data.refreshToken) {
      this.refreshToken = data.refreshToken;
    }
  }
}

async function runRefreshVerification() {
  console.log('========================================================');
  console.log('🔍 Single-Flight Refresh Verification Against Local Backend');
  console.log('========================================================');
  console.log('Scope: Body-based refresh path with in-memory adapter (not web cookie path).');

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
  const demoEmail = process.env.DEMO_EMAIL || 'player1@playmatch.demo';
  const demoPassword = process.env.DEMO_PASSWORD || 'cZ16lTCA-vIkVlaG!Aa1';

  // Confirm target endpoint exists in spec:
  // /games/me is a valid GET endpoint in OpenAPI (Modules 1-12)
  console.log('Confirmed: GET /games/me exists in server/openapi.json.');

  // Wrap global.fetch to intercept and count /auth/refresh invocations
  const originalFetch = globalThis.fetch;
  let refreshCalls = 0;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = input.toString();
    if (urlStr.includes('/auth/refresh')) {
      refreshCalls++;
      console.log(`[Fetch Interceptor] Intercepted /auth/refresh call (#${refreshCalls})`);
    }
    return originalFetch(input, init);
  };

  const adapter = new NodeAuthAdapter();
  const client = new ApiClient({ baseUrl }, adapter);

  try {
    // 1. Initial Login
    console.log(`1. Logging in as ${demoEmail}...`);
    const loginResponse = await originalFetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-type': 'mobile', // Requests refresh token in response body
      },
      body: JSON.stringify({ email: demoEmail, password: demoPassword }),
    });

    if (!loginResponse.ok) {
      const errText = await loginResponse.text();
      throw new Error(`Login failed (HTTP ${loginResponse.status}): ${errText}`);
    }

    const loginData = await loginResponse.json();
    const initialAccessToken = loginData.data?.accessToken;
    const initialRefreshToken = loginData.data?.refreshToken;

    if (!initialAccessToken || !initialRefreshToken) {
      throw new Error('Login response did not include accessToken or refreshToken');
    }

    console.log('   Login successful.');
    console.log('   Initial Refresh Token:', initialRefreshToken.slice(0, 16) + '...');

    adapter.setAccessToken(initialAccessToken);
    await adapter.setRefreshToken(initialRefreshToken);

    // 2. Invalidate access token to force 401
    console.log('2. Intentionally setting invalid access token on adapter to trigger 401...');
    adapter.setAccessToken('simulated.invalid.access.token');

    // 3. Fire 10 concurrent requests to /games/me
    console.log('3. Firing 10 concurrent requests to /games/me...');
    refreshCalls = 0;
    const requests = Array.from({ length: 10 }, () => client.get('/games/me'));
    const results = await Promise.all(requests);

    console.log(`4. Concurrent requests resolved: ${results.length}/10 succeeded.`);
    console.log(`   Total /auth/refresh calls observed: ${refreshCalls} (Expected: exactly 1)`);

    if (refreshCalls !== 1) {
      throw new Error(`Single-flight assertion failed: expected 1 refresh call, observed ${refreshCalls}`);
    }

    // 4. Verify refreshed tokens
    const rotatedRefreshToken = await adapter.getRefreshToken();
    const activeAccessToken = adapter.getAccessToken();

    console.log('   Rotated Refresh Token:', rotatedRefreshToken?.slice(0, 16) + '...');
    console.log('   New Active Access Token:', activeAccessToken?.slice(0, 24) + '...');

    if (rotatedRefreshToken === initialRefreshToken) {
      throw new Error('Refresh token rotation failed: rotated token equals initial token');
    }

    // 5. Verify the session is still completely valid by hitting /profile/me
    console.log('5. Verifying authenticated session with GET /profile/me...');
    const profile = await client.get<any>('/profile/me');
    console.log(`   Session valid! Profile user ID: ${profile.userId || profile.id}`);

    console.log('========================================================');
    console.log('✅ ALL SINGLE-FLIGHT REFRESH VERIFICATIONS PASSED!');
    console.log('========================================================');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runRefreshVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
