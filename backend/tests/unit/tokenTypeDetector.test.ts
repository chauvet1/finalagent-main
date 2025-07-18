import { TokenType } from '../../src/types/auth';
import { 
  TokenTypeDetectorImpl, 
  TokenPatternUtils, 
  createTokenTypeDetector,
  tokenTypeDetector 
} from '../../src/utils/tokenTypeDetector';

describe('TokenTypeDetector', () => {
  let detector: TokenTypeDetectorImpl;

  beforeEach(() => {
    detector = new TokenTypeDetectorImpl();
  });

  describe('detectTokenType', () => {
    it('should detect JWT tokens starting with eyJ', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(detector.detectTokenType(jwtToken)).toBe(TokenType.JWT);
    });

    it('should detect valid email addresses', () => {
      const emailToken = 'user@example.com';
      expect(detector.detectTokenType(emailToken)).toBe(TokenType.EMAIL);
    });

    it('should detect development tokens with dev: prefix', () => {
      const devToken = 'dev:admin@bahinlink.com';
      expect(detector.detectTokenType(devToken)).toBe(TokenType.DEVELOPMENT);
    });

    it('should handle null token', () => {
      expect(detector.detectTokenType(null as any)).toBe(TokenType.JWT);
    });

    it('should handle empty string', () => {
      expect(detector.detectTokenType('')).toBe(TokenType.JWT);
    });
  });
});

describe('TokenPatternUtils', () => {
  describe('isJWTToken', () => {
    it('should return true for valid JWT tokens', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(TokenPatternUtils.isJWTToken(validJWT)).toBe(true);
    });

    it('should return false for tokens not starting with eyJ', () => {
      expect(TokenPatternUtils.isJWTToken('invalid.jwt.token')).toBe(false);
    });
  });

  describe('isEmailToken', () => {
    it('should return true for valid email addresses', () => {
      expect(TokenPatternUtils.isEmailToken('user@example.com')).toBe(true);
      expect(TokenPatternUtils.isEmailToken('admin@bahinlink.com')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(TokenPatternUtils.isEmailToken('invalid-email')).toBe(false);
      expect(TokenPatternUtils.isEmailToken('@domain.com')).toBe(false);
    });
  });

  describe('isDevelopmentToken', () => {
    it('should return true for tokens starting with dev:', () => {
      expect(TokenPatternUtils.isDevelopmentToken('dev:admin@bahinlink.com')).toBe(true);
      expect(TokenPatternUtils.isDevelopmentToken('dev:test')).toBe(true);
    });

    it('should return false for tokens not starting with dev:', () => {
      expect(TokenPatternUtils.isDevelopmentToken('admin@bahinlink.com')).toBe(false);
    });
  });
});