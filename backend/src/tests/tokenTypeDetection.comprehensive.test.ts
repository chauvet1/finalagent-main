import { describe, it, expect, beforeEach } from '@jest/globals';
import { TokenType } from '../types/auth';
import { TokenTypeDetectorImpl, TokenPatternUtils } from '../utils/tokenTypeDetector';

describe('Token Type Detection Comprehensive Tests (No Mock Data)', () => {
  let detector: TokenTypeDetectorImpl;

  beforeEach(() => {
    detector = new TokenTypeDetectorImpl();
  });

  describe('JWT Token Detection', () => {
    it('should detect valid JWT tokens with standard format', () => {
      const jwtTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o',
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.EkN-DOsnsuRjRO6BxXemmJDm3HbxrbRzXglbN2S4sOkopdU4IsDxTI8jO19W_A4K8ZPJijNLis4EZsHeY559a4DFOd50_OqgHs3PH-GKjqDXzhsJUMY7cjsJjrqhqrXm2Jnvgs4XuVxVdSn9Oi_QW6a3dnI2YwrnYwYrNbqZvn1Pq2SHScs1MlQFw6FWFsr_dn148Zg5yd6tNtSFdVTssqHdqVyUs5_y3BjWsMj4kHlVVKgfecvMjn8F5oJIK_5nU6QjVWHHDj2t9cqtgUBfg5yEHdPtbmdofMdVv1oh6ofjkqB6cNcaLRnx6Y6iyb-o8d-MSpsJtduh95JCS-kuqg'
      ];

      jwtTokens.forEach(token => {
        const result = detector.detectTokenType(token);
        expect(result).toBe(TokenType.JWT);
      });
    });

    it('should detect JWT tokens with whitespace', () => {
      const tokenWithSpaces = '  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token  ';
      const result = detector.detectTokenType(tokenWithSpaces);
      expect(result).toBe(TokenType.JWT);
    });

    it('should validate JWT token format using TokenPatternUtils', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
      const invalidJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.onlyTwoParts';
      
      expect(TokenPatternUtils.isJWTToken(validJWT)).toBe(true);
      expect(TokenPatternUtils.isJWTToken(invalidJWT)).toBe(false);
    });
  });

  describe('Email Token Detection', () => {
    it('should detect valid email addresses', () => {
      const emailTokens = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'admin@bahinlink.com',
        'user.name@subdomain.example.org',
        'test123@test-domain.com',
        'user_name@example-domain.net'
      ];

      emailTokens.forEach(email => {
        const result = detector.detectTokenType(email);
        expect(result).toBe(TokenType.EMAIL);
      });
    });   
 it('should validate email format using TokenPatternUtils', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'admin+tag@company.co.uk'
      ];
      
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com'
      ];

      validEmails.forEach(email => {
        expect(TokenPatternUtils.isEmailToken(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(TokenPatternUtils.isEmailToken(email)).toBe(false);
      });
    });

    it('should handle email tokens with special characters', () => {
      const specialEmails = [
        'user+test@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user123@example.com'
      ];

      specialEmails.forEach(email => {
        const result = detector.detectTokenType(email);
        expect(result).toBe(TokenType.EMAIL);
      });
    });
  });

  describe('Development Token Detection', () => {
    it('should detect development tokens with proper prefix', () => {
      const devTokens = [
        'dev:admin@example.com',
        'dev:user@bahinlink.com',
        'dev:test.user@domain.org',
        'dev:client@company.co.uk'
      ];

      devTokens.forEach(token => {
        const result = detector.detectTokenType(token);
        expect(result).toBe(TokenType.DEVELOPMENT);
      });
    });

    it('should validate development token format using TokenPatternUtils', () => {
      const validDevTokens = [
        'dev:admin@example.com',
        'dev:user@domain.org'
      ];
      
      const invalidDevTokens = [
        'development:user@example.com',
        'not-dev-token',
        'DEV:user@example.com',
        'dev user@example.com'
      ];
      
      const devTokensWithInvalidEmails = [
        'dev:invalid-email',
        'dev:',
        'dev:user@'
      ];

      validDevTokens.forEach(token => {
        expect(TokenPatternUtils.isDevelopmentToken(token)).toBe(true);
      });
      
      invalidDevTokens.forEach(token => {
        expect(TokenPatternUtils.isDevelopmentToken(token)).toBe(false);
      });
      
      // These have valid dev: prefix but invalid email format
      devTokensWithInvalidEmails.forEach(token => {
        expect(TokenPatternUtils.isDevelopmentToken(token)).toBe(true);
        // But email extraction should fail
        expect(TokenPatternUtils.extractEmailFromDevToken(token)).toBeNull();
      });
    });

    it('should extract email from development tokens', () => {
      const testCases = [
        { token: 'dev:admin@example.com', expectedEmail: 'admin@example.com' },
        { token: 'dev:user@domain.org', expectedEmail: 'user@domain.org' },
        { token: 'dev:invalid-email', expectedEmail: null },
        { token: 'not-dev-token', expectedEmail: null }
      ];

      testCases.forEach(({ token, expectedEmail }) => {
        const result = TokenPatternUtils.extractEmailFromDevToken(token);
        expect(result).toBe(expectedEmail);
      });
    });
  });  
    describe('Edge Cases and Error Scenarios', () => {
    it('should handle null and undefined tokens', () => {
      expect(detector.detectTokenType(null as any)).toBe(TokenType.JWT);
      expect(detector.detectTokenType(undefined as any)).toBe(TokenType.JWT);
    });

    it('should handle empty and whitespace-only tokens', () => {
      expect(detector.detectTokenType('')).toBe(TokenType.JWT);
      expect(detector.detectTokenType('   ')).toBe(TokenType.JWT);
      expect(detector.detectTokenType('\t\n')).toBe(TokenType.JWT);
    });

    it('should handle non-string token types', () => {
      expect(detector.detectTokenType(123 as any)).toBe(TokenType.JWT);
      expect(detector.detectTokenType({} as any)).toBe(TokenType.JWT);
      expect(detector.detectTokenType([] as any)).toBe(TokenType.JWT);
    });

    it('should handle very long tokens', () => {
      const longJWT = 'eyJ' + 'a'.repeat(1000) + '.eyJ' + 'b'.repeat(1000) + '.' + 'c'.repeat(1000);
      const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';
      const longDevToken = 'dev:' + 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';

      expect(detector.detectTokenType(longJWT)).toBe(TokenType.JWT);
      expect(detector.detectTokenType(longEmail)).toBe(TokenType.EMAIL);
      expect(detector.detectTokenType(longDevToken)).toBe(TokenType.DEVELOPMENT);
    });

    it('should handle tokens with unusual characters', () => {
      const unicodeEmail = 'tëst@éxample.com';
      const emojiToken = '😀@example.com';
      const specialCharsToken = 'user!#$%@example.com';

      // These should still be detected based on @ presence
      expect(detector.detectTokenType(unicodeEmail)).toBe(TokenType.EMAIL);
      expect(detector.detectTokenType(emojiToken)).toBe(TokenType.EMAIL);
      expect(detector.detectTokenType(specialCharsToken)).toBe(TokenType.EMAIL);
    });
  });

  describe('Token Format Validation', () => {
    it('should validate token format against expected type', () => {
      const testCases = [
        { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.test', expectedType: TokenType.JWT, shouldBeValid: true },
        { token: 'user@example.com', expectedType: TokenType.EMAIL, shouldBeValid: true },
        { token: 'dev:admin@example.com', expectedType: TokenType.DEVELOPMENT, shouldBeValid: true },
        { token: 'user@example.com', expectedType: TokenType.JWT, shouldBeValid: false },
        { token: 'eyJhbGciOiJIUzI1NiJ9.test', expectedType: TokenType.EMAIL, shouldBeValid: false },
        { token: 'admin@example.com', expectedType: TokenType.DEVELOPMENT, shouldBeValid: false }
      ];

      testCases.forEach(({ token, expectedType, shouldBeValid }) => {
        const result = TokenPatternUtils.validateTokenFormat(token, expectedType);
        expect(result).toBe(shouldBeValid);
      });
    });
  });

  describe('Token Description for Logging', () => {
    it('should generate safe token descriptions', () => {
      const testCases = [
        { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.test', expectedPattern: /^jwt_token\(\d+_chars\)$/ },
        { token: 'user@example.com', expectedPattern: /^email_token\(us\*\*\*@example\.com\)$/ },
        { token: 'dev:admin@example.com', expectedPattern: /^dev_token\(admin@example\.com\)$/ },
        { token: 'invalid-token', expectedPattern: /^unknown_token\(\d+_chars\)$/ },
        { token: '', expectedPattern: /^invalid_token$/ }
      ];

      testCases.forEach(({ token, expectedPattern }) => {
        const description = TokenPatternUtils.getTokenDescription(token);
        expect(description).toMatch(expectedPattern);
      });
    });

    it('should mask sensitive information in email descriptions', () => {
      const sensitiveEmails = [
        'john.doe@company.com',
        'admin@secret-domain.com',
        'longusername@b.com'
      ];

      sensitiveEmails.forEach(email => {
        const description = TokenPatternUtils.getTokenDescription(email);
        expect(description).toContain('***');
        const localPart = email.split('@')[0];
        if (localPart.length > 2) {
          // Should not contain the full local part
          expect(description).not.toContain(localPart);
          // Should contain first 2 characters
          expect(description).toContain(localPart.substring(0, 2));
        } else {
          // For short emails, should only contain ***
          expect(description).toContain('***');
        }
      });
    });
  });
});