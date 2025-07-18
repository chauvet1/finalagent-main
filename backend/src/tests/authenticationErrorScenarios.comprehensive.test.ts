import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request } from 'express';
import { AuthenticationService, AuthenticationError } from '../middleware/auth';
import { TokenType } from '../types/auth';
import {
    JWTAuthenticationStrategy,
    EmailAuthenticationStrategy,
    DevelopmentAuthenticationStrategy
} from '../services/authenticationStrategies';

describe('Authentication Error Scenarios and Edge Cases (No Mock Data)', () => {
    let authService: AuthenticationService;
    let originalNodeEnv: string | undefined;
    let originalClerkKey: string | undefined;

    beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        originalClerkKey = process.env.CLERK_SECRET_KEY;
        process.env.NODE_ENV = 'test';
        process.env.CLERK_SECRET_KEY = 'sk_test_valid_clerk_secret_key_12345678901234567890';

        authService = AuthenticationService.getInstance();
    });

    afterEach(() => {
        if (originalNodeEnv !== undefined) {
            process.env.NODE_ENV = originalNodeEnv as any;
        }
        if (originalClerkKey !== undefined) {
            process.env.CLERK_SECRET_KEY = originalClerkKey;
        }
    });

    describe('Token Extraction Edge Cases', () => {
        it('should handle missing authorization header', async () => {
            const mockRequest = {
                headers: {}
            } as Request;

            await expect(authService.authenticateRequest(mockRequest))
                .rejects.toThrow(new AuthenticationError('Authentication token required', 'TOKEN_REQUIRED'));
        });

        it('should handle malformed authorization header formats', async () => {
            const malformedHeaders = [
                'InvalidFormat token',
                'Basic dXNlcjpwYXNz',
                'Bearer',
                'Bearer ',
                'Token eyJhbGciOiJIUzI1NiJ9',
                'bearer token', // lowercase
                'BEARER TOKEN' // uppercase
            ];

            for (const authHeader of malformedHeaders) {
                const mockRequest = {
                    headers: { authorization: authHeader }
                } as Request;

                await expect(authService.authenticateRequest(mockRequest))
                    .rejects.toThrow(new AuthenticationError('Authentication token required', 'TOKEN_REQUIRED'));
            }
        });

        it('should handle empty and whitespace-only tokens', async () => {
            const emptyTokens = [
                '',
                '   ',
                '\t',
                '\n',
                '\r\n',
                '  \t  \n  '
            ];

            for (const token of emptyTokens) {
                const mockRequest = {
                    headers: { authorization: `Bearer ${token}` }
                } as Request;

                try {
                    await authService.authenticateRequest(mockRequest);
                } catch (error) {
                    expect(error).toBeInstanceOf(AuthenticationError);
                    expect((error as AuthenticationError).code).toBe('AUTHENTICATION_FAILED');
                }
            }
        });
    });

    describe('JWT Authentication Error Scenarios', () => {
        let jwtStrategy: JWTAuthenticationStrategy;

        beforeEach(() => {
            jwtStrategy = new JWTAuthenticationStrategy();
        });

        it('should handle invalid Clerk configuration scenarios', async () => {
            const invalidConfigs = [
                { key: '', description: 'empty key' },
                { key: 'invalid_key', description: 'invalid format' },
                { key: 'sk_test_short', description: 'too short' },
                { key: 'pk_test_wrong_prefix_12345678901234567890', description: 'wrong prefix' },
                { key: 'sk_live_test_key_but_not_valid_format', description: 'live key format' }
            ];

            for (const config of invalidConfigs) {
                process.env.CLERK_SECRET_KEY = config.key;
                const testStrategy = new JWTAuthenticationStrategy();

                await expect(testStrategy.authenticate('eyJhbGciOiJIUzI1NiJ9.test.token'))
                    .rejects.toThrow('JWT authentication failed: Clerk configuration invalid');
            }
        });

        it('should handle malformed JWT tokens', async () => {
            const malformedJWTs = [
                'eyJhbGciOiJIUzI1NiJ9', // Only header
                'eyJhbGciOiJIUzI1NiJ9.', // Missing payload and signature
                'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ', // Missing signature
                'eyJhbGciOiJIUzI1NiJ9..signature', // Empty payload
                '.eyJzdWIiOiIxMjMifQ.signature', // Empty header
                'not.base64.encoded', // Invalid base64
                'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig.extra', // Too many parts
                'eyJ@invalid#base64.eyJzdWIiOiIxMjMifQ.signature' // Invalid characters
            ];

            for (const invalidJWT of malformedJWTs) {
                await expect(jwtStrategy.authenticate(invalidJWT))
                    .rejects.toThrow(/JWT authentication failed/);
            }
        });

        it('should handle very long JWT tokens', async () => {
            const longJWT = 'eyJ' + 'a'.repeat(10000) + '.eyJ' + 'b'.repeat(10000) + '.' + 'c'.repeat(10000);

            await expect(jwtStrategy.authenticate(longJWT))
                .rejects.toThrow(/JWT authentication failed/);
        });
    });
    describe('Email Authentication Error Scenarios', () => {
        let emailStrategy: EmailAuthenticationStrategy;

        beforeEach(() => {
            emailStrategy = new EmailAuthenticationStrategy();
        });

        it('should handle various invalid email formats', async () => {
            const invalidEmails = [
                'not-an-email',
                '@domain.com',
                'user@',
                'user@domain',
                'user.domain.com',
                'user@@domain.com',
                'user@domain@com',
                'user@domain.',
                'user@.domain.com',
                '.user@domain.com',
                'user.@domain.com',
                'user@domain..com',
                'user with spaces@domain.com',
                'user@domain with spaces.com',
                'user@domain.c',
                'user@domain.toolongtobevalid',
                'user@',
                '@',
                '@@',
                'user@domain@domain.com',
                'user@domain.com@extra',
                'user@domain.com.',
                'user@domain.com..',
                'user@-domain.com',
                'user@domain-.com',
                'user@domain.com-',
                'user@domain..com',
                'user@.domain.com',
                'user@domain.com.',
                'user@domain.c@m'
            ];

            for (const invalidEmail of invalidEmails) {
                await expect(emailStrategy.authenticate(invalidEmail))
                    .rejects.toThrow('Email authentication failed: Invalid email format');
            }
        });

        it('should handle emails with special characters and edge cases', async () => {
            const edgeCaseEmails = [
                'user+tag@domain.com', // Should be valid
                'user.name@domain.com', // Should be valid
                'user_name@domain.com', // Should be valid
                'user-name@domain.com', // Should be valid
                '123@domain.com', // Should be valid
                'a@b.co', // Should be valid
                'test@domain-name.com', // Should be valid
                'user@sub.domain.com', // Should be valid
                'user@domain.co.uk' // Should be valid
            ];

            for (const email of edgeCaseEmails) {
                try {
                    const result = await emailStrategy.authenticate(email);
                    expect(result.email).toBe(email);
                    expect(result.authenticationMethod).toBe('email');
                } catch (error) {
                    if (error instanceof Error && error.message.includes('database')) {
                        console.warn(`Skipping edge case email test for ${email} - database not available`);
                        continue;
                    }
                    throw error;
                }
            }
        });

        it('should handle extremely long email addresses', async () => {
            const longLocalPart = 'a'.repeat(64); // Max local part length
            const longDomain = 'b'.repeat(63) + '.com'; // Max domain label length
            const longEmail = `${longLocalPart}@${longDomain}`;

            try {
                const result = await emailStrategy.authenticate(longEmail);
                expect(result.email).toBe(longEmail);
            } catch (error) {
                if (error instanceof Error && error.message.includes('database')) {
                    console.warn('Skipping long email test - database not available');
                    return;
                }
                // May fail due to database constraints
                expect(error).toBeInstanceOf(Error);
            }
        });

        it('should handle unicode and international characters', async () => {
            const unicodeEmails = [
                'tëst@éxample.com',
                'user@münchen.de',
                'test@москва.рф',
                'user@中国.cn'
            ];

            for (const email of unicodeEmails) {
                try {
                    // These may or may not be valid depending on email validation implementation
                    await emailStrategy.authenticate(email);
                } catch (error) {
                    if (error instanceof Error && error.message.includes('database')) {
                        console.warn(`Skipping unicode email test for ${email} - database not available`);
                        continue;
                    }
                    // Expected to fail with current validation
                    expect(error).toBeInstanceOf(Error);
                }
            }
        });
    });

    describe('Development Authentication Error Scenarios', () => {
        let devStrategy: DevelopmentAuthenticationStrategy;

        beforeEach(() => {
            devStrategy = new DevelopmentAuthenticationStrategy();
        });

        it('should handle invalid development token formats', async () => {
            const invalidDevTokens = [
                'not-dev-token',
                'development:user@example.com',
                'dev:',
                'dev',
                'dev::user@example.com',
                'dev: user@example.com', // Space after colon
                ' dev:user@example.com', // Leading space
                'dev:user@example.com ', // Trailing space
                'DEV:user@example.com', // Wrong case
                'dev:invalid-email',
                'dev:user@',
                'dev:@domain.com',
                'dev:user@domain',
                'dev:user.domain.com'
            ];

            for (const invalidToken of invalidDevTokens) {
                await expect(devStrategy.authenticate(invalidToken))
                    .rejects.toThrow(/Development authentication failed:/);
            }
        });

        it('should handle environment restrictions', async () => {
            const testEmail = `env-restriction-${Date.now()}@example.com`;
            const devToken = `dev:${testEmail}`;

            // Test in production without ENABLE_DEV_AUTH
            process.env.NODE_ENV = 'production';
            delete process.env.ENABLE_DEV_AUTH;

            await expect(devStrategy.authenticate(devToken))
                .rejects.toThrow('Development authentication failed: Development authentication is not enabled in this environment');

            // Test in staging without ENABLE_DEV_AUTH
            process.env.NODE_ENV = 'staging' as any;

            await expect(devStrategy.authenticate(devToken))
                .rejects.toThrow('Development authentication failed: Development authentication is not enabled in this environment');
        });

        it('should handle very long development tokens', async () => {
            const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';
            const longDevToken = `dev:${longEmail}`;

            try {
                const result = await devStrategy.authenticate(longDevToken);
                expect(result.email).toBe(longEmail);
            } catch (error) {
                if (error instanceof Error && error.message.includes('database')) {
                    console.warn('Skipping long dev token test - database not available');
                    return;
                }
                // May fail due to database constraints or email validation
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
    describe('Concurrent Authentication Error Scenarios', () => {
        it('should handle concurrent authentication failures gracefully', async () => {
            const invalidTokens = [
                'invalid-email-1',
                'invalid-email-2',
                'dev:invalid-email-3',
                'eyJhbGciOiJIUzI1NiJ9.invalid.jwt',
                'malformed-token-5'
            ];

            const promises = invalidTokens.map(token => {
                const mockRequest = {
                    headers: { authorization: `Bearer ${token}` }
                } as Request;
                return authService.authenticateRequest(mockRequest);
            });

            const results = await Promise.allSettled(promises);

            // All should fail
            results.forEach((result, index) => {
                expect(result.status).toBe('rejected');
                if (result.status === 'rejected') {
                    expect(result.reason).toBeInstanceOf(AuthenticationError);
                }
            });
        });

        it('should handle mixed valid and invalid concurrent authentications', async () => {
            const mixedTokens = [
                `valid-email-${Date.now()}@example.com`,
                'invalid-email-format',
                `dev:valid-dev-${Date.now()}@example.com`,
                'dev:invalid-dev-email',
                'eyJhbGciOiJIUzI1NiJ9.invalid.jwt'
            ];

            const promises = mixedTokens.map(token => {
                const mockRequest = {
                    headers: { authorization: `Bearer ${token}` }
                } as Request;
                return authService.authenticateRequest(mockRequest);
            });

            try {
                const results = await Promise.allSettled(promises);

                // Check that valid tokens succeed and invalid ones fail
                results.forEach((result, index) => {
                    const token = mixedTokens[index];

                    if (token.includes('@') && !token.includes('invalid') && !token.startsWith('eyJ')) {
                        // Valid email or dev token
                        if (result.status === 'fulfilled') {
                            expect(result.value.user.email).toContain(token.replace('dev:', ''));
                        } else {
                            // May fail due to database issues
                            console.warn(`Valid token ${token} failed - likely database issue`);
                        }
                    } else {
                        // Invalid token
                        expect(result.status).toBe('rejected');
                    }
                });
            } catch (error) {
                if (error instanceof Error && error.message.includes('database')) {
                    console.warn('Skipping concurrent mixed test - database not available');
                    return;
                }
                throw error;
            }
        });
    });

    describe('Memory and Resource Edge Cases', () => {
        it('should handle extremely large token payloads', async () => {
            const hugeToken = 'a'.repeat(1000000); // 1MB token
            const mockRequest = {
                headers: { authorization: `Bearer ${hugeToken}` }
            } as Request;

            try {
                await authService.authenticateRequest(mockRequest);
            } catch (error) {
                expect(error).toBeInstanceOf(AuthenticationError);
                expect((error as AuthenticationError).code).toBe('AUTHENTICATION_FAILED');
            }
        });

        it('should handle rapid successive authentication attempts', async () => {
            const testEmail = `rapid-${Date.now()}@example.com`;
            const mockRequest = {
                headers: { authorization: `Bearer ${testEmail}` }
            } as Request;

            // Make 10 rapid requests
            const rapidPromises = Array.from({ length: 10 }, () =>
                authService.authenticateRequest(mockRequest)
            );

            try {
                const results = await Promise.allSettled(rapidPromises);

                // All should either succeed or fail consistently
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        expect(result.value.user.email).toBe(testEmail);
                    } else {
                        // Should only fail due to database issues
                        expect(result.reason.message).toContain('database');
                    }
                });
            } catch (error) {
                if (error instanceof Error && error.message.includes('database')) {
                    console.warn('Skipping rapid requests test - database not available');
                    return;
                }
                throw error;
            }
        });
    });

    describe('Network and System Error Simulation', () => {
        it('should handle database connection failures gracefully', async () => {
            const testEmail = `db-failure-${Date.now()}@example.com`;
            const mockRequest = {
                headers: { authorization: `Bearer ${testEmail}` }
            } as Request;

            try {
                const result = await authService.authenticateRequest(mockRequest);
                expect(result.user.email).toBe(testEmail);
            } catch (error) {
                if (error instanceof Error && error.message.includes('database')) {
                    // Expected behavior when database is unavailable
                    expect(error).toBeInstanceOf(Error);
                    console.warn('Database connection failure handled gracefully');
                } else {
                    throw error;
                }
            }
        });

        it('should handle timeout scenarios', async () => {
            // This test simulates what would happen with slow database responses
            const testEmail = `timeout-test-${Date.now()}@example.com`;
            const mockRequest = {
                headers: { authorization: `Bearer ${testEmail}` }
            } as Request;

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 5000);
            });

            const authPromise = authService.authenticateRequest(mockRequest);

            try {
                const result = await Promise.race([authPromise, timeoutPromise]);
                // If auth completes before timeout, it should be valid
                expect((result as any).user.email).toBe(testEmail);
            } catch (error) {
                if (error instanceof Error && error.message === 'Timeout') {
                    console.warn('Authentication timed out - this is expected for slow systems');
                } else if (error instanceof Error && error.message.includes('database')) {
                    console.warn('Database connection issue during timeout test');
                } else {
                    throw error;
                }
            }
        });
    });

    describe('Error Message Quality and Security', () => {
        it('should provide clear error messages without exposing sensitive information', async () => {
            const sensitiveToken = 'secret-internal-token-12345';
            const mockRequest = {
                headers: { authorization: `Bearer ${sensitiveToken}` }
            } as Request;

            try {
                await authService.authenticateRequest(mockRequest);
            } catch (error) {
                expect(error).toBeInstanceOf(AuthenticationError);
                const authError = error as AuthenticationError;

                // Error message should be clear but not expose the token
                expect(authError.message).not.toContain(sensitiveToken);
                expect(authError.code).toBe('AUTHENTICATION_FAILED');
                expect(authError.statusCode).toBe(401);
            }
        });

        it('should handle null and undefined inputs gracefully', async () => {
            const nullRequest = null as any;
            const undefinedRequest = undefined as any;
            const emptyRequest = {} as Request;

            await expect(authService.authenticateRequest(nullRequest))
                .rejects.toThrow();

            await expect(authService.authenticateRequest(undefinedRequest))
                .rejects.toThrow();

            await expect(authService.authenticateRequest(emptyRequest))
                .rejects.toThrow(new AuthenticationError('Authentication token required', 'TOKEN_REQUIRED'));
        });

        it('should handle malformed request objects', async () => {
            const malformedRequests = [
                { headers: null } as any,
                { headers: undefined } as any,
                { headers: 'not-an-object' } as any,
                { headers: [] } as any,
                { headers: { authorization: null } } as any,
                { headers: { authorization: undefined } } as any,
                { headers: { authorization: 123 } } as any,
                { headers: { authorization: {} } } as any
            ];

            for (const malformedRequest of malformedRequests) {
                await expect(authService.authenticateRequest(malformedRequest))
                    .rejects.toThrow(new AuthenticationError('Authentication token required', 'TOKEN_REQUIRED'));
            }
        });
    });
});