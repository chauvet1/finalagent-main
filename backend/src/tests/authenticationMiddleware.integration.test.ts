import { describe, it, expect, beforeEach } from '@jest/globals';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { 
  requireAuth, 
  requireRole, 
  requireAdmin, 
  requireClient, 
  optionalAuth
} from '../middleware/auth';
import { TokenType } from '../types/auth';

describe('Authentication Middleware Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Set up valid Clerk configuration for testing
    process.env.CLERK_SECRET_KEY = 'sk_test_valid_clerk_secret_key_12345678901234567890';
    
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  describe('requireAuth Middleware', () => {
    it('should authenticate user with valid email token', async () => {
      const testEmail = `middleware-test-${Date.now()}@example.com`;
      
      // Set up route with requireAuth middleware
      app.get('/protected', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            email: req.user?.email,
            role: req.user?.role,
            tokenType: req.auth?.tokenType,
            authenticationMethod: req.auth?.authenticationMethod
          }
        });
      });

      try {
        const response = await request(app)
          .get('/protected')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
        expect(response.body.user.tokenType).toBe(TokenType.EMAIL);
        expect(response.body.user.authenticationMethod).toBe('email');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should authenticate user with valid development token', async () => {
      const testEmail = `dev-middleware-${Date.now()}@example.com`;
      const devToken = `dev:${testEmail}`;
      
      // Set up route with requireAuth middleware
      app.get('/dev-protected', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            email: req.user?.email,
            role: req.user?.role,
            tokenType: req.auth?.tokenType,
            authenticationMethod: req.auth?.authenticationMethod
          }
        });
      });

      try {
        const response = await request(app)
          .get('/dev-protected')
          .set('Authorization', `Bearer ${devToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
        expect(response.body.user.tokenType).toBe(TokenType.DEVELOPMENT);
        expect(response.body.user.authenticationMethod).toBe('development');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should reject request with missing authorization header', async () => {
      // Set up route with requireAuth middleware
      app.get('/protected-no-auth', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected-no-auth')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
      expect(response.body.error.message).toBe('Authentication token required');
    });

    it('should reject request with invalid token format', async () => {
      // Set up route with requireAuth middleware
      app.get('/protected-invalid-format', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected-invalid-format')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
      expect(response.body.error.message).toBe('Authentication token required');
    });

    it('should reject request with invalid email token', async () => {
      // Set up route with requireAuth middleware
      app.get('/protected-invalid-email', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected-invalid-email')
        .set('Authorization', 'Bearer invalid-email-format')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toContain('Authentication failed');
    });

    it('should handle authentication service errors gracefully', async () => {
      // Set up route with requireAuth middleware
      app.get('/protected-invalid-dev', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected-invalid-dev')
        .set('Authorization', 'Bearer dev:invalid-email')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toContain('Development authentication failed');
    });
  });

  describe('requireRole Middleware', () => {
    it('should allow access for user with correct role', async () => {
      const testEmail = `role-test-${Date.now()}@example.com`;
      
      // Set up route with requireAuth and requireRole middleware
      app.get('/admin-only', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            email: req.user?.email,
            role: req.user?.role
          }
        });
      });

      try {
        const response = await request(app)
          .get('/admin-only')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should deny access for unauthenticated request', async () => {
      // Set up route with requireRole middleware (no auth middleware)
      app.get('/admin-no-auth', requireRole(['ADMIN']), (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/admin-no-auth')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });
  });

  describe('requireAdmin Middleware', () => {
    it('should allow access for admin user', async () => {
      const testEmail = `admin-test-${Date.now()}@example.com`;
      
      // Set up route with requireAuth and requireAdmin middleware
      app.get('/admin-endpoint', requireAuth, requireAdmin, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            email: req.user?.email,
            role: req.user?.role
          }
        });
      });

      try {
        const response = await request(app)
          .get('/admin-endpoint')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });
  });

  describe('optionalAuth Middleware', () => {
    it('should authenticate user when valid token provided', async () => {
      const testEmail = `optional-auth-${Date.now()}@example.com`;
      
      // Set up route with optionalAuth middleware
      app.get('/optional-endpoint', optionalAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          authenticated: !!req.user,
          user: req.user ? {
            email: req.user.email,
            role: req.user.role,
            tokenType: req.auth?.tokenType,
            authenticationMethod: req.auth?.authenticationMethod
          } : null
        });
      });

      try {
        const response = await request(app)
          .get('/optional-endpoint')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.authenticated).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.tokenType).toBe(TokenType.EMAIL);
        expect(response.body.user.authenticationMethod).toBe('email');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should continue without authentication when no token provided', async () => {
      // Set up route with optionalAuth middleware
      app.get('/optional-no-token', optionalAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          authenticated: !!req.user,
          user: req.user || null
        });
      });

      const response = await request(app)
        .get('/optional-no-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });

    it('should continue without authentication when invalid token provided', async () => {
      // Set up route with optionalAuth middleware
      app.get('/optional-invalid-token', optionalAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          authenticated: !!req.user,
          user: req.user || null
        });
      });

      const response = await request(app)
        .get('/optional-invalid-token')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });
  });

  describe('Middleware Chain Integration', () => {
    it('should work correctly in middleware chain', async () => {
      const testEmail = `chain-test-${Date.now()}@example.com`;
      
      // Set up route with multiple middleware
      app.get('/protected-admin-chain', requireAuth, requireAdmin, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            email: req.user?.email,
            role: req.user?.role,
            tokenType: req.auth?.tokenType,
            authenticationMethod: req.auth?.authenticationMethod
          }
        });
      });

      try {
        const response = await request(app)
          .get('/protected-admin-chain')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
        expect(response.body.user.tokenType).toBe(TokenType.EMAIL);
        expect(response.body.user.authenticationMethod).toBe('email');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should stop chain on authentication failure', async () => {
      // Set up route with multiple middleware
      app.get('/protected-admin-fail', requireAuth, requireAdmin, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected-admin-fail')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toContain('Authentication failed');
    });
  });

  describe('Enhanced Logging and Audit', () => {
    it('should provide comprehensive audit information in auth context', async () => {
      const testEmail = `audit-test-${Date.now()}@example.com`;
      
      // Set up route that returns auth context for verification
      app.get('/audit-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          auth: {
            tokenType: req.auth?.tokenType,
            authenticationMethod: req.auth?.authenticationMethod,
            sessionId: req.auth?.sessionId,
            authenticatedAt: req.auth?.authenticatedAt,
            hasUserId: !!req.auth?.userId,
            hasClaims: !!req.auth?.claims
          }
        });
      });

      try {
        const response = await request(app)
          .get('/audit-test')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.auth.tokenType).toBe(TokenType.EMAIL);
        expect(response.body.auth.authenticationMethod).toBe('email');
        expect(response.body.auth.sessionId).toMatch(/^email_/);
        expect(response.body.auth.authenticatedAt).toBeDefined();
        expect(response.body.auth.hasUserId).toBe(true);
        expect(response.body.auth.hasClaims).toBe(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should log authentication failures with context information', async () => {
      // Set up route with requireAuth middleware
      app.get('/audit-fail-test', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/audit-fail-test')
        .set('Authorization', 'Bearer dev:invalid-email-format')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toContain('Development authentication failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle AuthenticationError correctly', async () => {
      // Set up route with requireAuth middleware
      app.get('/auth-error-test', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/auth-error-test')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
      expect(response.body.error.message).toBe('Authentication token required');
    });

    it('should handle AuthorizationError correctly', async () => {
      const testEmail = `client-test-${Date.now()}@example.com`;
      
      // Set up route that requires CLIENT role (but our users are ADMIN)
      app.get('/client-only-test', requireAuth, requireClient, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      try {
        const response = await request(app)
          .get('/client-only-test')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INSUFFICIENT_ROLE');
        expect(response.body.error.message).toContain('Access denied');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });
  });

  describe('Performance and Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const testEmails = Array.from({ length: 5 }, (_, i) => 
        `concurrent-test-${i}-${Date.now()}@example.com`
      );
      
      // Set up route with requireAuth middleware
      app.get('/concurrent-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            email: req.user?.email,
            tokenType: req.auth?.tokenType
          }
        });
      });

      try {
        const promises = testEmails.map(email =>
          request(app)
            .get('/concurrent-test')
            .set('Authorization', `Bearer ${email}`)
            .expect(200)
        );

        const responses = await Promise.all(promises);

        responses.forEach((response, index) => {
          expect(response.body.success).toBe(true);
          expect(response.body.user.email).toBe(testEmails[index]);
          expect(response.body.user.tokenType).toBe(TokenType.EMAIL);
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping database integration test - database not available');
          return;
        }
        throw error;
      }
    });
  });
});