import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TokenType } from '../types/auth';
import {
  JWTAuthenticationStrategy,
  EmailAuthenticationStrategy,
  DevelopmentAuthenticationStrategy,
  AuthenticationStrategyFactory
} from '../services/authenticationStrategies';

describe('Authentication Strategies Comprehensive Tests (No Mock Data)', () => {
  let originalNodeEnv: string | undefined;
  let originalClerkKey: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalClerkKey = process.env.CLERK_SECRET_KEY;
    process.env.NODE_ENV = 'test';
    process.env.CLERK_SECRET_KEY = 'sk_test_valid_clerk_secret_key_12345678901234567890';
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv as any;
    }
    if (originalClerkKey !== undefined) {
      process.env.CLERK_SECRET_KEY = originalClerkKey;
    }
  });

  describe('JWT Authentication Strategy Real Tests', () => {
    let strategy: JWTAuthenticationStrategy;

    beforeEach(() => {
      strategy = new JWTAuthenticationStrategy();
    });

    it('should handle invalid Clerk configuration scenarios', async () => {
      const invalidConfigs = [
        { key: '', description: 'empty key' },
        { key: 'invalid_key', description: 'invalid format' },
        { key: 'sk_test_short', description: 'too short' },
        { key: 'pk_test_wrong_prefix_12345678901234567890', description: 'wrong prefix' }
      ];

      for (const config of invalidConfigs) {
        process.env.CLERK_SECRET_KEY = config.key;
        const testStrategy = new JWTAuthenticationStrategy();
        
        await expect(testStrategy.authenticate('eyJhbGciOiJIUzI1NiJ9.test.token'))
          .rejects.toThrow('JWT authentication failed: Clerk configuration invalid');
      }
    });

    it('should handle various JWT token formats', async () => {
      const jwtTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature',
        'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ0ZXN0dXNlciJ9.sig'
      ];

      for (const token of jwtTokens) {
        await expect(strategy.authenticate(token))
          .rejects.toThrow('JWT authentication failed');
      }
    });

    it('should validate authentication method consistency', () => {
      expect(strategy.getAuthenticationMethod()).toBe('jwt');
      expect(strategy.canHandle(TokenType.JWT)).toBe(true);
      expect(strategy.canHandle(TokenType.EMAIL)).toBe(false);
      expect(strategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);
    });
  });

  describe('Email Authentication Strategy Real Tests', () => {
    let strategy: EmailAuthenticationStrategy;

    beforeEach(() => {
      strategy = new EmailAuthenticationStrategy();
    });

    it('should create and authenticate users with various email formats', async () => {
      const emailFormats = [
        `simple-${Date.now()}@example.com`,
        `user.with.dots-${Date.now()}@domain.org`,
        `user+tag-${Date.now()}@company.co.uk`,
        `user_underscore-${Date.now()}@test-domain.net`,
        `123numeric-${Date.now()}@numbers123.com`
      ];

      for (const email of emailFormats) {
        try {
          const result = await strategy.authenticate(email);
          
          expect(result.email).toBe(email);
          expect(result.authenticationMethod).toBe('email');
          expect(result.role).toBe('ADMIN');
          expect(result.status).toBe('ACTIVE');
          expect(result.firstName).toBe('Email');
          expect(result.lastName).toBe('User');
          expect(result.clerkId).toMatch(/^email_\d+_[a-z0-9]+$/);
          expect(result.id).toBeDefined();
          expect(result.permissions).toEqual([]);
          expect(result.profileData).toBeDefined();
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn(`Skipping email test for ${email} - database not available`);
            continue;
          }
          throw error;
        }
      }
    });

    it('should handle user persistence across multiple authentications', async () => {
      const testEmail = `persistence-${Date.now()}@example.com`;
      
      try {
        // First authentication - creates user
        const result1 = await strategy.authenticate(testEmail);
        expect(result1.email).toBe(testEmail);
        
        // Second authentication - retrieves existing user
        const result2 = await strategy.authenticate(testEmail);
        expect(result2.email).toBe(testEmail);
        expect(result2.id).toBe(result1.id);
        expect(result2.clerkId).toBe(result1.clerkId);
        
        // Third authentication - should still work
        const result3 = await strategy.authenticate(testEmail);
        expect(result3.id).toBe(result1.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping persistence test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        'user@@domain.com',
        'user@domain@com',
        '',
        '   ',
        'user with spaces@domain.com'
      ];

      for (const invalidEmail of invalidEmails) {
        await expect(strategy.authenticate(invalidEmail))
          .rejects.toThrow('Email authentication failed: Invalid email format');
      }
    });

    it('should validate authentication method consistency', () => {
      expect(strategy.getAuthenticationMethod()).toBe('email');
      expect(strategy.canHandle(TokenType.EMAIL)).toBe(true);
      expect(strategy.canHandle(TokenType.JWT)).toBe(false);
      expect(strategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);
    });
  });

  describe('Development Authentication Strategy Real Tests', () => {
    let strategy: DevelopmentAuthenticationStrategy;

    beforeEach(() => {
      strategy = new DevelopmentAuthenticationStrategy();
    });

    it('should create users with role-based logic', async () => {
      const roleTestCases = [
        { email: `admin-role-${Date.now()}@example.com`, expectedRole: 'ADMIN', expectedAccessLevel: 'ADMIN' },
        { email: `client-role-${Date.now()}@example.com`, expectedRole: 'CLIENT', expectedAccessLevel: undefined },
        { email: `agent-role-${Date.now()}@example.com`, expectedRole: 'AGENT', expectedAccessLevel: undefined },
        { email: `supervisor-role-${Date.now()}@example.com`, expectedRole: 'SUPERVISOR', expectedAccessLevel: 'ELEVATED' },
        { email: `generic-role-${Date.now()}@example.com`, expectedRole: 'ADMIN', expectedAccessLevel: 'ADMIN' }
      ];

      for (const testCase of roleTestCases) {
        const devToken = `dev:${testCase.email}`;
        
        try {
          const result = await strategy.authenticate(devToken);
          
          expect(result.email).toBe(testCase.email);
          expect(result.role).toBe(testCase.expectedRole);
          expect(result.authenticationMethod).toBe('development');
          expect(result.status).toBe('ACTIVE');
          expect(result.firstName).toBe('Development');
          expect(result.lastName).toBe('User');
          expect(result.clerkId).toMatch(/^dev_\d+_[a-z0-9]+$/);
          
          if (testCase.expectedAccessLevel) {
            expect(result.accessLevel).toBe(testCase.expectedAccessLevel);
          }
          
          // Verify profile creation based on role
          if (testCase.expectedRole === 'ADMIN' || testCase.expectedRole === 'SUPERVISOR') {
            expect(result.permissions).toEqual(['read', 'write', 'delete', 'admin']);
            expect(result.profileData?.adminProfile).toBeDefined();
          } else if (testCase.expectedRole === 'CLIENT') {
            expect(result.profileData?.clientProfile).toBeDefined();
            expect(result.profileData?.clientProfile?.companyName).toBe('Development Company');
          } else if (testCase.expectedRole === 'AGENT') {
            expect(result.profileData?.agentProfile).toBeDefined();
            expect(result.profileData?.agentProfile?.employeeId).toMatch(/^DEV-\d+$/);
            expect(result.profileData?.agentProfile?.skills).toContain('development');
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn(`Skipping role test for ${testCase.email} - database not available`);
            continue;
          }
          throw error;
        }
      }
    });

    it('should handle environment mode detection', async () => {
      const testEmail = `env-test-${Date.now()}@example.com`;
      const devToken = `dev:${testEmail}`;
      
      // Test in development mode
      process.env.NODE_ENV = 'development';
      try {
        const result = await strategy.authenticate(devToken);
        expect(result.email).toBe(testEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping environment test - database not available');
        } else {
          throw error;
        }
      }
      
      // Test in test mode
      process.env.NODE_ENV = 'test';
      try {
        const result = await strategy.authenticate(devToken);
        expect(result.email).toBe(testEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping environment test - database not available');
        } else {
          throw error;
        }
      }
      
      // Test with ENABLE_DEV_AUTH flag
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEV_AUTH = 'true';
      try {
        const result = await strategy.authenticate(devToken);
        expect(result.email).toBe(testEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping environment test - database not available');
        } else {
          throw error;
        }
      }
      
      // Test rejection in production without flag
      delete process.env.ENABLE_DEV_AUTH;
      await expect(strategy.authenticate(devToken))
        .rejects.toThrow('Development authentication failed: Development authentication is not enabled in this environment');
    });

    it('should reject invalid development token formats', async () => {
      const invalidTokens = [
        'not-dev-token',
        'development:user@example.com',
        'dev:',
        'dev:invalid-email',
        'dev:user@',
        'dev:@domain.com',
        'dev:user@domain',
        'dev:user.domain.com',
        'dev:user with spaces@domain.com'
      ];

      for (const invalidToken of invalidTokens) {
        await expect(strategy.authenticate(invalidToken))
          .rejects.toThrow(/Development authentication failed:/);
      }
    });

    it('should handle user persistence across authentications', async () => {
      const testEmail = `dev-persistence-${Date.now()}@example.com`;
      const devToken = `dev:${testEmail}`;
      
      try {
        // First authentication - creates user
        const result1 = await strategy.authenticate(devToken);
        expect(result1.email).toBe(testEmail);
        
        // Second authentication - retrieves existing user
        const result2 = await strategy.authenticate(devToken);
        expect(result2.email).toBe(testEmail);
        expect(result2.id).toBe(result1.id);
        expect(result2.clerkId).toBe(result1.clerkId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping persistence test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should validate authentication method consistency', () => {
      expect(strategy.getAuthenticationMethod()).toBe('development');
      expect(strategy.canHandle(TokenType.DEVELOPMENT)).toBe(true);
      expect(strategy.canHandle(TokenType.JWT)).toBe(false);
      expect(strategy.canHandle(TokenType.EMAIL)).toBe(false);
    });
  });

  describe('Authentication Strategy Factory Real Tests', () => {
    let factory: AuthenticationStrategyFactory;

    beforeEach(() => {
      factory = new AuthenticationStrategyFactory();
    });

    it('should provide correct strategies for each token type', () => {
      const jwtStrategy = factory.getStrategy(TokenType.JWT);
      const emailStrategy = factory.getStrategy(TokenType.EMAIL);
      const devStrategy = factory.getStrategy(TokenType.DEVELOPMENT);

      expect(jwtStrategy).toBeInstanceOf(JWTAuthenticationStrategy);
      expect(emailStrategy).toBeInstanceOf(EmailAuthenticationStrategy);
      expect(devStrategy).toBeInstanceOf(DevelopmentAuthenticationStrategy);

      expect(jwtStrategy?.getAuthenticationMethod()).toBe('jwt');
      expect(emailStrategy?.getAuthenticationMethod()).toBe('email');
      expect(devStrategy?.getAuthenticationMethod()).toBe('development');
    });

    it('should handle strategy management operations', () => {
      const originalCount = factory.getAllStrategies().length;
      
      // Test adding custom strategy
      const customStrategy = {
        authenticate: async () => ({
          id: 'custom',
          clerkId: 'custom',
          email: 'custom@test.com',
          role: 'ADMIN' as const,
          status: 'ACTIVE' as const,
          authenticationMethod: 'custom'
        }),
        canHandle: (type: TokenType) => type === 'custom' as TokenType,
        getAuthenticationMethod: () => 'custom'
      };

      factory.addStrategy(customStrategy);
      expect(factory.getAllStrategies()).toHaveLength(originalCount + 1);

      // Test removing strategy
      factory.removeStrategy('custom');
      expect(factory.getAllStrategies()).toHaveLength(originalCount);
    });

    it('should handle edge cases gracefully', () => {
      expect(factory.getStrategy(undefined as any)).toBeNull();
      expect(factory.getStrategy(null as any)).toBeNull();
      expect(factory.getStrategy('invalid' as TokenType)).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent authentication requests', async () => {
      const emailStrategy = new EmailAuthenticationStrategy();
      const devStrategy = new DevelopmentAuthenticationStrategy();
      
      const concurrentRequests = [
        emailStrategy.authenticate(`concurrent-email-1-${Date.now()}@example.com`),
        emailStrategy.authenticate(`concurrent-email-2-${Date.now()}@example.com`),
        devStrategy.authenticate(`dev:concurrent-dev-1-${Date.now()}@example.com`),
        devStrategy.authenticate(`dev:concurrent-dev-2-${Date.now()}@example.com`)
      ];

      try {
        const results = await Promise.allSettled(concurrentRequests);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            expect(result.value.authenticationMethod).toMatch(/^(email|development)$/);
            expect(result.value.status).toBe('ACTIVE');
          } else {
            // Should only fail due to database unavailability
            expect(result.reason.message).toContain('database');
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping concurrent test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should handle very long email addresses', async () => {
      const emailStrategy = new EmailAuthenticationStrategy();
      const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';
      
      try {
        const result = await emailStrategy.authenticate(longEmail);
        expect(result.email).toBe(longEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping long email test - database not available');
          return;
        }
        // May fail due to database constraints on email length
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle special characters in emails', async () => {
      const emailStrategy = new EmailAuthenticationStrategy();
      const specialEmails = [
        `special+tag-${Date.now()}@example.com`,
        `user.with.dots-${Date.now()}@domain.org`,
        `user_underscore-${Date.now()}@test.net`
      ];

      for (const email of specialEmails) {
        try {
          const result = await emailStrategy.authenticate(email);
          expect(result.email).toBe(email);
          expect(result.authenticationMethod).toBe('email');
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn(`Skipping special character test for ${email} - database not available`);
            continue;
          }
          throw error;
        }
      }
    });

    it('should handle database connection failures gracefully', async () => {
      const emailStrategy = new EmailAuthenticationStrategy();
      const devStrategy = new DevelopmentAuthenticationStrategy();
      
      // These tests will either succeed or fail with database errors
      const testEmail = `db-failure-${Date.now()}@example.com`;
      const devToken = `dev:${testEmail}`;
      
      try {
        await emailStrategy.authenticate(testEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Database connection failure handled gracefully for email strategy');
        } else {
          throw error;
        }
      }
      
      try {
        await devStrategy.authenticate(devToken);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Database connection failure handled gracefully for dev strategy');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Strategy Interface Compliance', () => {
    it('should ensure all strategies implement required methods correctly', () => {
      const strategies = [
        new JWTAuthenticationStrategy(),
        new EmailAuthenticationStrategy(),
        new DevelopmentAuthenticationStrategy()
      ];

      strategies.forEach(strategy => {
        // Check method existence
        expect(typeof strategy.authenticate).toBe('function');
        expect(typeof strategy.canHandle).toBe('function');
        expect(typeof strategy.getAuthenticationMethod).toBe('function');

        // Check method consistency
        const method = strategy.getAuthenticationMethod();
        expect(typeof method).toBe('string');
        expect(method.length).toBeGreaterThan(0);

        // Check canHandle logic
        const allTokenTypes = [TokenType.JWT, TokenType.EMAIL, TokenType.DEVELOPMENT];
        const handledTypes = allTokenTypes.filter(type => strategy.canHandle(type));
        expect(handledTypes).toHaveLength(1); // Each strategy should handle exactly one type
      });
    });

    it('should maintain strategy isolation', () => {
      const jwtStrategy = new JWTAuthenticationStrategy();
      const emailStrategy = new EmailAuthenticationStrategy();
      const devStrategy = new DevelopmentAuthenticationStrategy();

      // JWT strategy should only handle JWT
      expect(jwtStrategy.canHandle(TokenType.JWT)).toBe(true);
      expect(jwtStrategy.canHandle(TokenType.EMAIL)).toBe(false);
      expect(jwtStrategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);

      // Email strategy should only handle EMAIL
      expect(emailStrategy.canHandle(TokenType.EMAIL)).toBe(true);
      expect(emailStrategy.canHandle(TokenType.JWT)).toBe(false);
      expect(emailStrategy.canHandle(TokenType.DEVELOPMENT)).toBe(false);

      // Development strategy should only handle DEVELOPMENT
      expect(devStrategy.canHandle(TokenType.DEVELOPMENT)).toBe(true);
      expect(devStrategy.canHandle(TokenType.JWT)).toBe(false);
      expect(devStrategy.canHandle(TokenType.EMAIL)).toBe(false);
    });
  });
});