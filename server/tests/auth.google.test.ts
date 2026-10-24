import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { OAuth2Client } from 'google-auth-library';
import { app } from '../src/app.js';
import { config } from '../src/config/index.js';
import { HttpStatus } from '../src/constants/http-status.js';
import { ErrorCodes } from '../src/constants/error-codes.js';
import { Messages } from '../src/constants/messages.js';
import { UserStatuses } from '../src/constants/user-status.js';
import { User } from '../src/models/user.model.js';
import { tokenService } from '../src/services/token.service.js';
import { createTestUser, VALID_TEST_PASSWORD } from './fixtures/user.fixture.js';

describe('POST /api/v1/auth/google', () => {
  const originalClientId = config.GOOGLE_CLIENT_ID;
  const TEST_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';

  beforeEach(() => {
    config.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    config.GOOGLE_CLIENT_ID = originalClientId;
    vi.restoreAllMocks();
  });

  it('registers and logs in a valid new Google user with correct response shape and cookie', async () => {
    const mockPayload = {
      sub: 'google-uid-new-123',
      email: 'new.google.player@example.com',
      email_verified: true,
      name: 'Google Player',
    };

    const verifySpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => mockPayload,
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .set('x-client-type', 'web')
      .send({ credential: 'valid.google.jwt.token' });

    expect(verifySpy).toHaveBeenCalledWith({
      idToken: 'valid.google.jwt.token',
      audience: TEST_CLIENT_ID,
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(mockPayload.email);
    expect(res.body.data.user.name).toBe(mockPayload.name);
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Verify response does not leak passwordHash or internals
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    // Verify cookie set for web client
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('playmatch_refresh=');

    // Verify DB state
    const createdUser = await User.findOne({ email: mockPayload.email }).select('+passwordHash');
    expect(createdUser).toBeDefined();
    expect(createdUser?.googleId).toBe(mockPayload.sub);
    expect(createdUser?.passwordHash).toBeNull();
    expect(createdUser?.isEmailVerified).toBe(true);
  });

  it('links googleId to an existing verified account', async () => {
    const { user } = await createTestUser({
      email: 'existing.verified@example.com',
      isEmailVerified: true,
    });

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-link-456',
        email: 'existing.verified@example.com',
        email_verified: true,
        name: user.name,
      }),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'valid.google.credential' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.data.user.id).toBe(user.id);

    const updated = await User.findById(user._id).select('+passwordHash');
    expect(updated?.googleId).toBe('google-uid-link-456');
    // Existing password hash remains intact for verified users
    expect(updated?.passwordHash).toBeDefined();
  });

  it('removes passwordHash and revokes existing sessions when linking to an unverified existing account', async () => {
    const { user } = await createTestUser({
      email: 'existing.unverified@example.com',
      isEmailVerified: false,
    });

    // Create a refresh session to test revocation
    const activeRefreshToken = tokenService.generateRefreshToken();
    await tokenService.createRefreshSession({
      userId: user._id,
      token: activeRefreshToken,
      userAgent: 'test-agent',
      ip: '127.0.0.1',
      clientType: 'web',
    });

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-unverified-789',
        email: 'existing.unverified@example.com',
        email_verified: true,
        name: user.name,
      }),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'valid.google.credential' });

    expect(res.status).toBe(HttpStatus.OK);

    const updated = await User.findById(user._id).select('+passwordHash');
    expect(updated?.googleId).toBe('google-uid-unverified-789');
    expect(updated?.isEmailVerified).toBe(true);
    expect(updated?.passwordHash).toBeNull();

    // Verify previous session was revoked
    const { RefreshSession } = await import('../src/models/refresh-session.model.js');
    const activeSessions = await RefreshSession.find({ user: user._id, revokedAt: null });
    // The previous session was revoked (only the newly issued session is active)
    expect(activeSessions.length).toBe(1);
    const oldSession = await RefreshSession.findOne({ user: user._id, revokedAt: { $ne: null } });
    expect(oldSession).toBeDefined();
    expect(oldSession?.revokedAt).toBeInstanceOf(Date);
  });

  it('fails with generic auth error without calling verifyIdToken if GOOGLE_CLIENT_ID is empty', async () => {
    config.GOOGLE_CLIENT_ID = '';

    const verifySpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken');

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'any.credential' });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe(Messages.AUTH_GENERIC_INVALID_CREDENTIALS);
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('rejects with generic auth failure on expired token or Google verification error', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
      new Error('Token used too late, 1720000000 < 1720000100')
    );

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'expired.token' });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe(Messages.AUTH_GENERIC_INVALID_CREDENTIALS);
    // Never leak raw error
    expect(JSON.stringify(res.body)).not.toContain('Token used too late');
  });

  it('rejects with generic auth failure when email is not verified by Google', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-unverified-email',
        email: 'unverified.email@example.com',
        email_verified: false,
      }),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'unverified.token' });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe(Messages.AUTH_GENERIC_INVALID_CREDENTIALS);
  });

  it('rejects malformed requests missing credential with 400 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({});

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body.success).toBe(false);
  });

  it('rejects locked account exactly like normal login', async () => {
    const { user } = await createTestUser({
      email: 'locked.google@example.com',
    });
    user.lockUntil = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-locked',
        email: 'locked.google@example.com',
        email_verified: true,
      }),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'valid.token' });

    expect(res.status).toBe(HttpStatus.LOCKED);
    expect(res.body.error.code).toBe(ErrorCodes.AUTH_ACCOUNT_LOCKED);
    expect(res.body.error.message).toBe(Messages.AUTH_ACCOUNT_LOCKED);
  });

  it('rejects suspended account exactly like normal login', async () => {
    await createTestUser({
      email: 'suspended.google@example.com',
      status: UserStatuses.SUSPENDED,
    });

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-suspended',
        email: 'suspended.google@example.com',
        email_verified: true,
      }),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'valid.token' });

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
    expect(res.body.error.code).toBe(ErrorCodes.AUTH_ACCOUNT_SUSPENDED);
    expect(res.body.error.message).toBe(Messages.AUTH_ACCOUNT_SUSPENDED);
  });

  it('rejects archived account exactly like normal login', async () => {
    const archivedUser = await User.create({
      email: 'archived.google@example.com',
      name: 'Archived Player',
      role: 'player',
      status: UserStatuses.ARCHIVED,
      isEmailVerified: true,
      googleId: 'google-sub-archived',
    });

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-archived',
        email: archivedUser.email,
        email_verified: true,
      }),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'valid.token' });

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
    expect(res.body.error.code).toBe(ErrorCodes.AUTH_ACCOUNT_SUSPENDED);
  });

  describe('Google-only accounts (no passwordHash) security behaviors', () => {
    it('normal password login to /auth/login fails generically with no 500 and no hints', async () => {
      const googleUser = await User.create({
        email: 'googleonly@example.com',
        name: 'Google Only',
        googleId: 'google-only-id',
        passwordHash: null,
        role: 'player',
        isEmailVerified: true,
        status: UserStatuses.ACTIVE,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: googleUser.email,
          password: VALID_TEST_PASSWORD,
        });

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
      expect(res.body.error.message).toBe(Messages.AUTH_GENERIC_INVALID_CREDENTIALS);
    });

    it('forgot-password behaves generically with 200 success response, no hints and no 500', async () => {
      const googleUser = await User.create({
        email: 'googleonly.forgot@example.com',
        name: 'Google Only',
        googleId: 'google-only-forgot-id',
        passwordHash: null,
        role: 'player',
        isEmailVerified: true,
        status: UserStatuses.ACTIVE,
      });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: googleUser.email });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
    });

    it('change-password fails with current password incorrect (401), no hints and no 500', async () => {
      const googleUser = await User.create({
        email: 'googleonly.change@example.com',
        name: 'Google Only',
        googleId: 'google-only-change-id',
        passwordHash: null,
        role: 'player',
        isEmailVerified: true,
        status: UserStatuses.ACTIVE,
      });

      const token = tokenService.generateAccessToken({
        userId: googleUser.id,
        role: googleUser.role,
        email: googleUser.email,
      });

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: VALID_TEST_PASSWORD,
          newPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    });
  });
});
