import { ClerkTokenProvider, createTokenProvider, detectTokenType } from '../tokenProvider';
import { TokenType } from '../../types/auth';

// Add atob polyfill for Node.js environment
if (typeof window !== 'undefined' && !window.atob) {
  Object.defineProperty(window, 'atob', {
    value: (str: string) => Buffer.from(str, 'base64').toString('binary'),
    writable: true
  });
}

describe('ClerkTokenProvider', () => {
  describe('Token type detection', () => {
    it('should create token provider instance', () => {
      const clerkAuth = {};
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail: 'admin@bahinlink.com'
      });

      expect(tokenProvider).toBeInstanceOf(ClerkTokenProvider);
    });

    it('should handle development mode configuration', async () => {
      const clerkAuth = {};
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail: 'admin@bahinlink.com'
      });

      const token = await tokenProvider.getAuthToken();
      expect(token).toContain('dev:');
      expect(token).toContain('@');
    });

    it('should use fallback email in development mode', async () => {
      const clerkAuth = {};
      const fallbackEmail = 'test@bahinlink.com';
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail
      });

      const token = await tokenProvider.getAuthToken();
      expect(token).toBe(`dev:${fallbackEmail}`);
    });

    it('should detect token type correctly', async () => {
      const clerkAuth = {};
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail: 'admin@bahinlink.com'
      });

      const tokenType = await tokenProvider.getTokenType();
      expect(tokenType).toBe(TokenType.DEVELOPMENT);
    });

    it('should validate token availability', async () => {
      const clerkAuth = {};
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: true,
        fallbackEmail: 'admin@bahinlink.com'
      });

      const hasToken = await tokenProvider.hasValidToken();
      expect(hasToken).toBe(true);
    });
  });

  describe('Production mode behavior', () => {
    it('should handle production mode without Clerk token', async () => {
      const clerkAuth = {};
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: false,
        fallbackEmail: 'admin@bahinlink.com'
      });

      await expect(tokenProvider.getAuthToken()).rejects.toThrow();
    });

    it('should return false for hasValidToken in production without token', async () => {
      const clerkAuth = {};
      const tokenProvider = new ClerkTokenProvider(clerkAuth, {
        developmentMode: false
      });

      const hasToken = await tokenProvider.hasValidToken();
      expect(hasToken).toBe(false);
    });
  });
});

describe('detectTokenType utility', () => {
  it('should detect JWT tokens by eyJ prefix', () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
    expect(detectTokenType(jwtToken)).toBe(TokenType.JWT);
  });

  it('should detect development tokens by dev: prefix', () => {
    const devToken = 'dev:admin@example.com';
    expect(detectTokenType(devToken)).toBe(TokenType.DEVELOPMENT);
  });

  it('should detect email tokens by @ symbol', () => {
    const emailToken = 'admin@example.com';
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
  it('should create ClerkTokenProvider instance', () => {
    const clerkAuth = {};
    const provider = createTokenProvider(clerkAuth);
    expect(provider).toBeInstanceOf(ClerkTokenProvider);
  });

  it('should pass configuration to provider', () => {
    const clerkAuth = {};
    const config = {
      developmentMode: true,
      fallbackEmail: 'test@example.com'
    };
    const provider = createTokenProvider(clerkAuth, config);
    expect(provider).toBeInstanceOf(ClerkTokenProvider);
  });
});