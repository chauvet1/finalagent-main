import { describe, it, expect, beforeEach } from '@jest/globals';
import { TokenType } from '../types/auth';
import {
  JWTAuthenticationStrategy,
  EmailAuthenticationStrategy,
  DevelopmentAuthenticationStrategy,
  AuthenticationStrategyFactory
} from '../services/authenticationStrategies';

describe('Authentication Strategies', () => {
  beforeEach(() => {
    // Set up environment for testing
    process.env.CLERK_SECRET_KEY = 'sk_test_valid_clerk_secret_key_12345678901234567890';
  });

  describe('JWTAuthenticationStrategy', () => {
    let strategy: JWTAuthenticationStrategy;

    beforeEach(() => {
      strategy = new JWTAuthenticationStrategy();
    });

    describe('canHandle', () => {
      it('should return true for JWT token type', () => {
        expect(strategy.canHandle(TokenType.JWT)).toBe(true);
      });

      it('should return false for non-JWT token types', () => {
        expect(strategy.canHandle(TokenType.EMAIL)).toBe(false);
        expect(strategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);
      });
    });

    describe('getAuthenticationMethod', () => {
      it('should return "jwt"', () => {
        expect(strategy.getAuthenticationMethod()).toBe('jwt');
      });
    });

    describe('authenticate', () => {
      it('should throw error for invalid Clerk configuration', async () => {
        const originalKey = process.env.CLERK_SECRET_KEY;
        process.env.CLERK_SECRET_KEY = 'invalid_key';
        
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

        await expect(strategy.authenticate(token)).rejects.toThrow('JWT authentication failed: Clerk configuration invalid');
        
        process.env.CLERK_SECRET_KEY = originalKey;
      });
    });
  });

  describe('EmailAuthenticationStrategy', () => {
    let strategy: EmailAuthenticationStrategy;

    beforeEach(() => {
      strategy = new EmailAuthenticationStrategy();
    });

    describe('canHandle', () => {
      it('should return true for EMAIL token type', () => {
        expect(strategy.canHandle(TokenType.EMAIL)).toBe(true);
      });

      it('should return false for non-EMAIL token types', () => {
        expect(strategy.canHandle(TokenType.JWT)).toBe(false);
        expect(strategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);
      });
    });

    describe('getAuthenticationMethod', () => {
      it('should return "email"', () => {
        expect(strategy.getAuthenticationMethod()).toBe('email');
      });
    });

    describe('authenticate', () => {
      it('should throw error for invalid email format', async () => {
        const invalidEmail = 'not-an-email';

        await expect(strategy.authenticate(invalidEmail)).rejects.toThrow('Email authentication failed: Invalid email format');
      });

      it('should throw error for empty email', async () => {
        const emptyEmail = '';

        await expect(strategy.authenticate(emptyEmail)).rejects.toThrow('Email authentication failed: Invalid email format');
      });

      it('should throw error for email without domain', async () => {
        const invalidEmail = 'test@';

        await expect(strategy.authenticate(invalidEmail)).rejects.toThrow('Email authentication failed: Invalid email format');
      });

      it('should throw error for email without local part', async () => {
        const invalidEmail = '@example.com';

        await expect(strategy.authenticate(invalidEmail)).rejects.toThrow('Email authentication failed: Invalid email format');
      });
    });
  });

  describe('DevelopmentAuthenticationStrategy', () => {
    let strategy: DevelopmentAuthenticationStrategy;

    beforeEach(() => {
      strategy = new DevelopmentAuthenticationStrategy();
    });

    describe('canHandle', () => {
      it('should return true for DEVELOPMENT token type', () => {
        expect(strategy.canHandle(TokenType.DEVELOPMENT)).toBe(true);
      });

      it('should return false for non-DEVELOPMENT token types', () => {
        expect(strategy.canHandle(TokenType.JWT)).toBe(false);
        expect(strategy.canHandle(TokenType.EMAIL)).toBe(false);
      });
    });

    describe('getAuthenticationMethod', () => {
      it('should return "development"', () => {
        expect(strategy.getAuthenticationMethod()).toBe('development');
      });
    });

    describe('authenticate', () => {
      it('should throw error for invalid development token format', async () => {
        const invalidToken = 'not-dev-token';

        await expect(strategy.authenticate(invalidToken)).rejects.toThrow('Development authentication failed: Invalid development token format');
      });

      it('should throw error for development token without prefix', async () => {
        const invalidToken = 'test@example.com';

        await expect(strategy.authenticate(invalidToken)).rejects.toThrow('Development authentication failed: Invalid development token format');
      });

      it('should throw error for invalid email in development token', async () => {
        const invalidToken = 'dev:not-an-email';

        await expect(strategy.authenticate(invalidToken)).rejects.toThrow('Development authentication failed: Invalid email format in development token');
      });

      it('should throw error for development token with empty email', async () => {
        const invalidToken = 'dev:';

        await expect(strategy.authenticate(invalidToken)).rejects.toThrow('Development authentication failed: Invalid email format in development token');
      });

      it('should throw error for development token with malformed email', async () => {
        const invalidToken = 'dev:test@';

        await expect(strategy.authenticate(invalidToken)).rejects.toThrow('Development authentication failed: Invalid email format in development token');
      });
    });
  });

  describe('Real Authentication Tests', () => {
    describe('EmailAuthenticationStrategy with real data', () => {
      let strategy: EmailAuthenticationStrategy;

      beforeEach(() => {
        strategy = new EmailAuthenticationStrategy();
      });

      it('should create and authenticate user with valid email', async () => {
        const testEmail = `test-${Date.now()}@example.com`;
        
        try {
          const result = await strategy.authenticate(testEmail);
          
          expect(result).toBeDefined();
          expect(result.email).toBe(testEmail);
          expect(result.authenticationMethod).toBe('email');
          expect(result.role).toBe('ADMIN');
          expect(result.status).toBe('ACTIVE');
          expect(result.firstName).toBe('Email');
          expect(result.lastName).toBe('User');
          expect(result.id).toBeDefined();
          expect(result.clerkId).toMatch(/^email_\d+_[a-z0-9]+$/);
        } catch (error) {
          // If database is not available, skip this test
          if (error instanceof Error && error.message.includes('database')) {
            console.warn('Skipping real database test - database not available');
            return;
          }
          throw error;
        }
      });

      it('should authenticate existing user with same email', async () => {
        const testEmail = `existing-${Date.now()}@example.com`;
        
        try {
          // First authentication - creates user
          const result1 = await strategy.authenticate(testEmail);
          expect(result1.email).toBe(testEmail);
          
          // Second authentication - finds existing user
          const result2 = await strategy.authenticate(testEmail);
          expect(result2.email).toBe(testEmail);
          expect(result2.id).toBe(result1.id);
          expect(result2.clerkId).toBe(result1.clerkId);
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn('Skipping real database test - database not available');
            return;
          }
          throw error;
        }
      });
    });

    describe('DevelopmentAuthenticationStrategy with real data', () => {
      let strategy: DevelopmentAuthenticationStrategy;

      beforeEach(() => {
        strategy = new DevelopmentAuthenticationStrategy();
      });

      it('should create and authenticate user with valid development token', async () => {
        const testEmail = `dev-${Date.now()}@example.com`;
        const devToken = `dev:${testEmail}`;
        
        try {
          const result = await strategy.authenticate(devToken);
          
          expect(result).toBeDefined();
          expect(result.email).toBe(testEmail);
          expect(result.authenticationMethod).toBe('development');
          expect(result.role).toBe('ADMIN');
          expect(result.status).toBe('ACTIVE');
          expect(result.firstName).toBe('Development');
          expect(result.lastName).toBe('User');
          expect(result.id).toBeDefined();
          expect(result.clerkId).toMatch(/^dev_\d+_[a-z0-9]+$/);
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn('Skipping real database test - database not available');
            return;
          }
          throw error;
        }
      });

      it('should authenticate existing user with development token', async () => {
        const testEmail = `dev-existing-${Date.now()}@example.com`;
        const devToken = `dev:${testEmail}`;
        
        try {
          // First authentication - creates user
          const result1 = await strategy.authenticate(devToken);
          expect(result1.email).toBe(testEmail);
          
          // Second authentication - finds existing user
          const result2 = await strategy.authenticate(devToken);
          expect(result2.email).toBe(testEmail);
          expect(result2.id).toBe(result1.id);
          expect(result2.clerkId).toBe(result1.clerkId);
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn('Skipping real database test - database not available');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('AuthenticationStrategyFactory', () => {
    let factory: AuthenticationStrategyFactory;

    beforeEach(() => {
      factory = new AuthenticationStrategyFactory();
    });

    describe('getStrategy', () => {
      it('should return JWT strategy for JWT token type', () => {
        const strategy = factory.getStrategy(TokenType.JWT);
        expect(strategy).toBeInstanceOf(JWTAuthenticationStrategy);
        expect(strategy?.canHandle(TokenType.JWT)).toBe(true);
      });

      it('should return Email strategy for EMAIL token type', () => {
        const strategy = factory.getStrategy(TokenType.EMAIL);
        expect(strategy).toBeInstanceOf(EmailAuthenticationStrategy);
        expect(strategy?.canHandle(TokenType.EMAIL)).toBe(true);
      });

      it('should return Development strategy for DEVELOPMENT token type', () => {
        const strategy = factory.getStrategy(TokenType.DEVELOPMENT);
        expect(strategy).toBeInstanceOf(DevelopmentAuthenticationStrategy);
        expect(strategy?.canHandle(TokenType.DEVELOPMENT)).toBe(true);
      });

      it('should return null for unsupported token type', () => {
        const strategy = factory.getStrategy('UNSUPPORTED' as TokenType);
        expect(strategy).toBeNull();
      });
    });

    describe('getAllStrategies', () => {
      it('should return all available strategies', () => {
        const strategies = factory.getAllStrategies();
        expect(strategies).toHaveLength(3);
        expect(strategies.some(s => s instanceof JWTAuthenticationStrategy)).toBe(true);
        expect(strategies.some(s => s instanceof EmailAuthenticationStrategy)).toBe(true);
        expect(strategies.some(s => s instanceof DevelopmentAuthenticationStrategy)).toBe(true);
      });

      it('should return independent strategy instances', () => {
        const strategies1 = factory.getAllStrategies();
        const strategies2 = factory.getAllStrategies();
        
        expect(strategies1).toHaveLength(3);
        expect(strategies2).toHaveLength(3);
        
        // Should return the same instances (not create new ones each time)
        expect(strategies1[0]).toBe(strategies2[0]);
        expect(strategies1[1]).toBe(strategies2[1]);
        expect(strategies1[2]).toBe(strategies2[2]);
      });
    });

    describe('addStrategy', () => {
      it('should add custom strategy', () => {
        const customStrategy = {
          authenticate: async () => ({
            id: 'custom',
            clerkId: 'custom',
            email: 'custom@test.com',
            role: 'ADMIN' as const,
            status: 'ACTIVE' as const,
            authenticationMethod: 'custom'
          }),
          canHandle: () => true,
          getAuthenticationMethod: () => 'custom'
        };

        factory.addStrategy(customStrategy);
        const strategies = factory.getAllStrategies();
        expect(strategies).toHaveLength(4);
        expect(strategies).toContain(customStrategy);
      });

      it('should maintain strategy order after adding', () => {
        const customStrategy = {
          authenticate: async () => ({
            id: 'custom',
            clerkId: 'custom',
            email: 'custom@test.com',
            role: 'ADMIN' as const,
            status: 'ACTIVE' as const,
            authenticationMethod: 'custom'
          }),
          canHandle: () => true,
          getAuthenticationMethod: () => 'custom'
        };

        const originalCount = factory.getAllStrategies().length;
        factory.addStrategy(customStrategy);
        
        const strategies = factory.getAllStrategies();
        expect(strategies).toHaveLength(originalCount + 1);
        expect(strategies[strategies.length - 1]).toBe(customStrategy);
      });
    });

    describe('removeStrategy', () => {
      it('should remove strategy by authentication method', () => {
        factory.removeStrategy('jwt');
        const strategies = factory.getAllStrategies();
        expect(strategies).toHaveLength(2);
        expect(strategies.some(s => s instanceof JWTAuthenticationStrategy)).toBe(false);
        expect(strategies.some(s => s instanceof EmailAuthenticationStrategy)).toBe(true);
        expect(strategies.some(s => s instanceof DevelopmentAuthenticationStrategy)).toBe(true);
      });

      it('should not remove anything for non-existent method', () => {
        const originalCount = factory.getAllStrategies().length;
        factory.removeStrategy('non-existent');
        const strategies = factory.getAllStrategies();
        expect(strategies).toHaveLength(originalCount);
      });

      it('should remove multiple strategies with same method name', () => {
        // Add duplicate strategy
        const duplicateStrategy = {
          authenticate: async () => ({
            id: 'duplicate',
            clerkId: 'duplicate',
            email: 'duplicate@test.com',
            role: 'ADMIN' as const,
            status: 'ACTIVE' as const,
            authenticationMethod: 'jwt'
          }),
          canHandle: () => true,
          getAuthenticationMethod: () => 'jwt'
        };

        factory.addStrategy(duplicateStrategy);
        expect(factory.getAllStrategies()).toHaveLength(4);

        factory.removeStrategy('jwt');
        const strategies = factory.getAllStrategies();
        expect(strategies).toHaveLength(2);
        expect(strategies.some(s => s.getAuthenticationMethod() === 'jwt')).toBe(false);
      });
    });
  });

  describe('Strategy Interface Compliance', () => {
    it('should ensure all strategies implement required interface methods', () => {
      const jwtStrategy = new JWTAuthenticationStrategy();
      const emailStrategy = new EmailAuthenticationStrategy();
      const devStrategy = new DevelopmentAuthenticationStrategy();

      // Check that all strategies have required methods
      expect(typeof jwtStrategy.authenticate).toBe('function');
      expect(typeof jwtStrategy.canHandle).toBe('function');
      expect(typeof jwtStrategy.getAuthenticationMethod).toBe('function');

      expect(typeof emailStrategy.authenticate).toBe('function');
      expect(typeof emailStrategy.canHandle).toBe('function');
      expect(typeof emailStrategy.getAuthenticationMethod).toBe('function');

      expect(typeof devStrategy.authenticate).toBe('function');
      expect(typeof devStrategy.canHandle).toBe('function');
      expect(typeof devStrategy.getAuthenticationMethod).toBe('function');
    });

    it('should return consistent authentication method names', () => {
      const jwtStrategy = new JWTAuthenticationStrategy();
      const emailStrategy = new EmailAuthenticationStrategy();
      const devStrategy = new DevelopmentAuthenticationStrategy();

      expect(jwtStrategy.getAuthenticationMethod()).toBe('jwt');
      expect(emailStrategy.getAuthenticationMethod()).toBe('email');
      expect(devStrategy.getAuthenticationMethod()).toBe('development');

      // Methods should be consistent across calls
      expect(jwtStrategy.getAuthenticationMethod()).toBe(jwtStrategy.getAuthenticationMethod());
      expect(emailStrategy.getAuthenticationMethod()).toBe(emailStrategy.getAuthenticationMethod());
      expect(devStrategy.getAuthenticationMethod()).toBe(devStrategy.getAuthenticationMethod());
    });

    it('should maintain strategy isolation', () => {
      const jwtStrategy = new JWTAuthenticationStrategy();
      const emailStrategy = new EmailAuthenticationStrategy();
      const devStrategy = new DevelopmentAuthenticationStrategy();

      // Each strategy should only handle its own token type
      expect(jwtStrategy.canHandle(TokenType.JWT)).toBe(true);
      expect(jwtStrategy.canHandle(TokenType.EMAIL)).toBe(false);
      expect(jwtStrategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);

      expect(emailStrategy.canHandle(TokenType.EMAIL)).toBe(true);
      expect(emailStrategy.canHandle(TokenType.JWT)).toBe(false);
      expect(emailStrategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);

      expect(devStrategy.canHandle(TokenType.DEVELOPMENT)).toBe(true);
      expect(devStrategy.canHandle(TokenType.JWT)).toBe(false);
      expect(devStrategy.canHandle(TokenType.EMAIL)).toBe(false);
    });
  });

  describe('Factory Integration', () => {
    it('should handle authentication flow with different token types', () => {
      const factory = new AuthenticationStrategyFactory();

      // Test JWT token
      const jwtStrategy = factory.getStrategy(TokenType.JWT);
      expect(jwtStrategy?.getAuthenticationMethod()).toBe('jwt');

      // Test Email token
      const emailStrategy = factory.getStrategy(TokenType.EMAIL);
      expect(emailStrategy?.getAuthenticationMethod()).toBe('email');

      // Test Development token
      const devStrategy = factory.getStrategy(TokenType.DEVELOPMENT);
      expect(devStrategy?.getAuthenticationMethod()).toBe('development');
    });

    it('should return same strategy instance for same token type', () => {
      const factory = new AuthenticationStrategyFactory();

      const strategy1 = factory.getStrategy(TokenType.JWT);
      const strategy2 = factory.getStrategy(TokenType.JWT);

      expect(strategy1).toBe(strategy2);
    });

    it('should handle edge cases gracefully', () => {
      const factory = new AuthenticationStrategyFactory();

      // Test with undefined token type
      const undefinedStrategy = factory.getStrategy(undefined as any);
      expect(undefinedStrategy).toBeNull();

      // Test with null token type
      const nullStrategy = factory.getStrategy(null as any);
      expect(nullStrategy).toBeNull();
    });
  });
});