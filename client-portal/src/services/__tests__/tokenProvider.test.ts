import { ClientTokenProvider, createTokenProvider, detectTokenType } from '../tokenProvider';
import { TokenType } from '../../types/auth';

describe('ClientTokenProvider', () => {
  describe('Token provider creation', () => {
    it('should create token provider instance', () => {
      const clerkAuth = {};
      const tokenProvider = new ClientTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });

      expect(tokenProvider).toBeInstanceOf(ClientTokenProvider);
    });

    it('should create provider without clerkAuth', () => {
      const tokenProvider = new ClientTokenProvider(undefined, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });

      expect(tokenProvider).toBeInstanceOf(ClientTokenProvider);
    });
  });

  describe('Development mode functionality', () => {
    it('should handle development mode configuration', async () => {
      const clerkAuth = {};
      const tokenProvider = new ClientTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });

      const token = await tokenProvider.getAuthToken();
      expect(token).toContain('dev:');
      expect(token).toContain('@');
    });

    it('should use fallback email in development mode', async () => {
      const fallbackEmail = 'test@client.com';
      const tokenProvider = new ClientTokenProvider(undefined, {
        developmentMode: true,
        fallbackEmail
      });

      const token = await tokenProvider.getAuthToken();
      expect(token).toBe(`dev:${fallbackEmail}`);
    });

    it('should detect token type correctly for development tokens', async () => {
      const tokenProvider = new ClientTokenProvider(undefined, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });

      const tokenType = await tokenProvider.getTokenType();
      expect(tokenType).toBe(TokenType.DEVELOPMENT);
    });

    it('should validate token availability in development mode', async () => {
      const tokenProvider = new ClientTokenProvider(undefined, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });

      const hasToken = await tokenProvider.hasValidToken();
      expect(hasToken).toBe(true);
    });
  });

  describe('Production mode behavior', () => {
    it('should handle production mode without stored token', async () => {
      const tokenProvider = new ClientTokenProvider(undefined, {
        developmentMode: false
      });

      await expect(tokenProvider.getAuthToken()).rejects.toThrow();
    });

    it('should return false when no token available in production', async () => {
      const tokenProvider = new ClientTokenProvider(undefined, {
        developmentMode: false
      });

      const hasToken = await tokenProvider.hasValidToken();
      expect(hasToken).toBe(false);
    });
  });

  describe('Token management methods', () => {
    it('should have setToken method', () => {
      const tokenProvider = new ClientTokenProvider();
      expect(typeof tokenProvider.setToken).toBe('function');
    });

    it('should have clearToken method', () => {
      const tokenProvider = new ClientTokenProvider();
      expect(typeof tokenProvider.clearToken).toBe('function');
    });

    it('should not throw when calling token management methods', () => {
      const tokenProvider = new ClientTokenProvider();
      expect(() => tokenProvider.setToken('test-token')).not.toThrow();
      expect(() => tokenProvider.clearToken()).not.toThrow();
    });
  });
});

describe('detectTokenType utility', () => {
  it('should detect JWT tokens by eyJ prefix', () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
    expect(detectTokenType(jwtToken)).toBe(TokenType.JWT);
  });

  it('should detect development tokens by dev: prefix', () => {
    const devToken = 'dev:client@example.com';
    expect(detectTokenType(devToken)).toBe(TokenType.DEVELOPMENT);
  });

  it('should detect email tokens by @ symbol', () => {
    const emailToken = 'client@example.com';
    expect(detectTokenType(emailToken)).toBe(TokenType.EMAIL);
  });

  it('should default to JWT for unknown token formats', () => {
    const unknownToken = 'some-random-token';
    expect(detectTokenType(unknownToken)).toBe(TokenType.JWT);
  });

  it('should handle empty strings', () => {
    const emptyToken = '';
    expect(detectTokenType(emptyToken)).toBe(TokenType.JWT);
  });
});

describe('createTokenProvider factory', () => {
  it('should create ClientTokenProvider instance', () => {
    const clerkAuth = {};
    const provider = createTokenProvider(clerkAuth);
    expect(provider).toBeInstanceOf(ClientTokenProvider);
  });

  it('should create provider without clerkAuth', () => {
    const provider = createTokenProvider();
    expect(provider).toBeInstanceOf(ClientTokenProvider);
  });

  it('should pass configuration to provider', () => {
    const clerkAuth = {};
    const config = {
      developmentMode: true,
      fallbackEmail: 'test@example.com'
    };
    const provider = createTokenProvider(clerkAuth, config);
    expect(provider).toBeInstanceOf(ClientTokenProvider);
  });
});