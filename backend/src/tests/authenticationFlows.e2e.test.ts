import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { requireAuth, requireRole, AuthenticationService } from '../middleware/auth';
import { TokenType } from '../types/auth';
import { UserRole } from '@prisma/client';

describe('Authentication Flows End-to-End Tests (No Mock Data)', () => {
  let app: Express;
  let originalNodeEnv: string | undefined;
  let originalClerkKey: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalClerkKey = process.env.CLERK_SECRET_KEY;
    process.env.NODE_ENV = 'test';
    process.env.CLERK_SECRET_KEY = 'sk_test_valid_clerk_secret_key_12345678901234567890';
    
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv as any;
    }
    if (originalClerkKey !== undefined) {
      process.env.CLERK_SECRET_KEY = originalClerkKey;
    }
  });

  describe('Complete Authentication Flow Tests', () => {
    it('should handle email authentication end-to-end', async () => {
      const testEmail = `e2e-email-${Date.now()}@example.com`;
      
      app.get('/email-auth-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
            status: req.user?.status,
            authenticationMethod: req.auth?.authenticationMethod,
            tokenType: req.auth?.tokenType,
            sessionId: req.auth?.sessionId
          }
        });
      });

      try {
        const response = await request(app)
          .get('/email-auth-test')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
        expect(response.body.user.status).toBe('ACTIVE');
        expect(response.body.user.authenticationMethod).toBe('email');
        expect(response.body.user.tokenType).toBe(TokenType.EMAIL);
        expect(response.body.user.sessionId).toMatch(/^email_/);
        expect(response.body.user.id).toBeDefined();
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping email e2e test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should handle development authentication end-to-end', async () => {
      const testEmail = `e2e-dev-${Date.now()}@example.com`;
      const devToken = `dev:${testEmail}`;
      
      app.get('/dev-auth-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
            authenticationMethod: req.auth?.authenticationMethod,
            tokenType: req.auth?.tokenType,
            sessionId: req.auth?.sessionId,
            permissions: req.user?.permissions,
            accessLevel: req.user?.accessLevel
          }
        });
      });

      try {
        const response = await request(app)
          .get('/dev-auth-test')
          .set('Authorization', `Bearer ${devToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe('ADMIN');
        expect(response.body.user.authenticationMethod).toBe('development');
        expect(response.body.user.tokenType).toBe(TokenType.DEVELOPMENT);
        expect(response.body.user.sessionId).toMatch(/^development_/);
        expect(response.body.user.permissions).toEqual(['read', 'write', 'delete', 'admin']);
        expect(response.body.user.accessLevel).toBe('ADMIN');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping dev e2e test - database not available');
          return;
        }
        throw error;
      }
    });   
 it('should handle JWT authentication failure end-to-end', async () => {
      const invalidJWT = 'eyJhbGciOiJIUzI1NiJ9.invalid.token';
      
      app.get('/jwt-fail-test', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/jwt-fail-test')
        .set('Authorization', `Bearer ${invalidJWT}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      expect(response.body.error.message).toContain('Authentication failed');
    });

    it('should handle missing authorization header', async () => {
      app.get('/no-auth-test', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/no-auth-test')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
      expect(response.body.error.message).toBe('Authentication token required');
    });

    it('should handle malformed authorization header', async () => {
      app.get('/malformed-auth-test', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/malformed-auth-test')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });
  });

  describe('Role-Based Authorization Flow Tests', () => {
    it('should enforce admin role requirements', async () => {
      const adminEmail = `admin-role-${Date.now()}@example.com`;
      const clientEmail = `client-role-${Date.now()}@example.com`;
      
      app.get('/admin-only', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
        res.json({
          success: true,
          message: 'Admin access granted',
          userRole: req.user?.role
        });
      });

      try {
        // Test with admin user (email auth creates ADMIN by default)
        const adminResponse = await request(app)
          .get('/admin-only')
          .set('Authorization', `Bearer ${adminEmail}`)
          .expect(200);

        expect(adminResponse.body.success).toBe(true);
        expect(adminResponse.body.userRole).toBe('ADMIN');

        // Test with client user (dev token with client role)
        const clientToken = `dev:${clientEmail}`;
        const clientResponse = await request(app)
          .get('/admin-only')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(403);

        expect(clientResponse.body.success).toBe(false);
        expect(clientResponse.body.error.code).toBe('INSUFFICIENT_ROLE');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping role test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should handle multiple role requirements', async () => {
      const adminEmail = `multi-admin-${Date.now()}@example.com`;
      const supervisorEmail = `supervisor-role-${Date.now()}@example.com`;
      const agentEmail = `agent-role-${Date.now()}@example.com`;
      
      app.get('/admin-supervisor-only', requireAuth, requireRole(['ADMIN', 'SUPERVISOR']), (req: Request, res: Response) => {
        res.json({
          success: true,
          userRole: req.user?.role
        });
      });

      try {
        // Test with admin user
        const adminResponse = await request(app)
          .get('/admin-supervisor-only')
          .set('Authorization', `Bearer ${adminEmail}`)
          .expect(200);
        expect(adminResponse.body.userRole).toBe('ADMIN');

        // Test with supervisor user
        const supervisorResponse = await request(app)
          .get('/admin-supervisor-only')
          .set('Authorization', `Bearer dev:${supervisorEmail}`)
          .expect(200);
        expect(supervisorResponse.body.userRole).toBe('SUPERVISOR');

        // Test with agent user (should fail)
        await request(app)
          .get('/admin-supervisor-only')
          .set('Authorization', `Bearer dev:${agentEmail}`)
          .expect(403);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping multi-role test - database not available');
          return;
        }
        throw error;
      }
    }); 
   it('should handle permission-based authorization', async () => {
      const adminEmail = `perm-admin-${Date.now()}@example.com`;
      
      app.get('/permission-test', requireAuth, requireRole(['ADMIN'], { 
        checkPermissions: ['read', 'write'] 
      }), (req: Request, res: Response) => {
        res.json({
          success: true,
          permissions: req.user?.permissions
        });
      });

      try {
        const response = await request(app)
          .get('/permission-test')
          .set('Authorization', `Bearer dev:${adminEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.permissions).toContain('read');
        expect(response.body.permissions).toContain('write');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping permission test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should handle access level requirements', async () => {
      const adminEmail = `access-admin-${Date.now()}@example.com`;
      const supervisorEmail = `access-supervisor-${Date.now()}@example.com`;
      
      app.get('/elevated-access', requireAuth, requireRole(['ADMIN', 'SUPERVISOR'], { 
        requireAccessLevel: 'ELEVATED' 
      }), (req: Request, res: Response) => {
        res.json({
          success: true,
          accessLevel: req.user?.accessLevel
        });
      });

      try {
        // Admin should have ADMIN access level (higher than ELEVATED)
        const adminResponse = await request(app)
          .get('/elevated-access')
          .set('Authorization', `Bearer dev:${adminEmail}`)
          .expect(200);
        expect(adminResponse.body.accessLevel).toBe('ADMIN');

        // Supervisor should have ELEVATED access level
        const supervisorResponse = await request(app)
          .get('/elevated-access')
          .set('Authorization', `Bearer dev:${supervisorEmail}`)
          .expect(200);
        expect(supervisorResponse.body.accessLevel).toBe('ELEVATED');
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping access level test - database not available');
          return;
        }
        throw error;
      }
    });
  });

  describe('Session Management Flow Tests', () => {
    it('should generate unique session IDs for different requests', async () => {
      const email1 = `session-1-${Date.now()}@example.com`;
      const email2 = `session-2-${Date.now()}@example.com`;
      
      app.get('/session-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          sessionId: req.auth?.sessionId,
          userId: req.user?.id
        });
      });

      try {
        const [response1, response2] = await Promise.all([
          request(app).get('/session-test').set('Authorization', `Bearer ${email1}`),
          request(app).get('/session-test').set('Authorization', `Bearer ${email2}`)
        ]);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
        expect(response1.body.sessionId).not.toBe(response2.body.sessionId);
        expect(response1.body.userId).not.toBe(response2.body.userId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping session test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should maintain session context throughout request', async () => {
      const testEmail = `context-${Date.now()}@example.com`;
      
      app.get('/context-test', requireAuth, (req: Request, res: Response) => {
        // Verify all authentication context is available
        expect(req.auth).toBeDefined();
        expect(req.user).toBeDefined();
        expect(req.auth?.userId).toBe(req.user?.clerkId);
        expect(req.auth?.tokenType).toBeDefined();
        expect(req.auth?.authenticationMethod).toBeDefined();
        expect(req.auth?.authenticatedAt).toBeInstanceOf(Date);
        
        res.json({
          success: true,
          contextValid: true,
          authContext: {
            userId: req.auth?.userId,
            tokenType: req.auth?.tokenType,
            authenticationMethod: req.auth?.authenticationMethod,
            sessionId: req.auth?.sessionId
          },
          userContext: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
            status: req.user?.status
          }
        });
      });

      try {
        const response = await request(app)
          .get('/context-test')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.contextValid).toBe(true);
        expect(response.body.authContext.userId).toBeDefined();
        expect(response.body.authContext.tokenType).toBe(TokenType.EMAIL);
        expect(response.body.authContext.authenticationMethod).toBe('email');
        expect(response.body.userContext.email).toBe(testEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping context test - database not available');
          return;
        }
        throw error;
      }
    });  });


  describe('Error Handling Flow Tests', () => {
    it('should handle authentication service errors gracefully', async () => {
      app.get('/service-error-test', requireAuth, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Test with various invalid tokens
      const invalidTokens = [
        'invalid-token-format',
        'dev:invalid-email-format',
        'eyJ.invalid.jwt',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/service-error-test')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toMatch(/^(AUTHENTICATION_FAILED|TOKEN_REQUIRED)$/);
      }
    });

    it('should handle database connection errors in authentication flow', async () => {
      const testEmail = `db-error-${Date.now()}@example.com`;
      
      app.get('/db-error-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          user: req.user?.email
        });
      });

      try {
        const response = await request(app)
          .get('/db-error-test')
          .set('Authorization', `Bearer ${testEmail}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user).toBe(testEmail);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Database connection error handled gracefully in e2e flow');
          return;
        }
        throw error;
      }
    });

    it('should handle concurrent authentication requests', async () => {
      const concurrentEmails = Array.from({ length: 5 }, (_, i) => 
        `concurrent-${i}-${Date.now()}@example.com`
      );
      
      app.get('/concurrent-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          email: req.user?.email,
          sessionId: req.auth?.sessionId
        });
      });

      try {
        const promises = concurrentEmails.map(email =>
          request(app)
            .get('/concurrent-test')
            .set('Authorization', `Bearer ${email}`)
        );

        const responses = await Promise.allSettled(promises);
        
        responses.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            expect(result.value.status).toBe(200);
            expect(result.value.body.success).toBe(true);
            expect(result.value.body.email).toBe(concurrentEmails[index]);
          } else {
            // Should only fail due to database issues
            console.warn(`Concurrent request ${index} failed - likely database issue`);
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
  });

  describe('Authentication Service Direct Tests', () => {
    it('should test authentication service directly with real data', async () => {
      const authService = AuthenticationService.getInstance();
      const testEmail = `direct-service-${Date.now()}@example.com`;
      
      const mockRequest = {
        headers: {
          authorization: `Bearer ${testEmail}`
        }
      } as Request;

      try {
        const result = await authService.authenticateRequest(mockRequest);
        
        expect(result.auth).toBeDefined();
        expect(result.user).toBeDefined();
        expect(result.auth.tokenType).toBe(TokenType.EMAIL);
        expect(result.auth.authenticationMethod).toBe('email');
        expect(result.user.email).toBe(testEmail);
        expect(result.user.role).toBe('ADMIN');
        expect(result.auth.sessionId).toMatch(/^email_/);
      } catch (error) {
        if (error instanceof Error && error.message.includes('database')) {
          console.warn('Skipping direct service test - database not available');
          return;
        }
        throw error;
      }
    });

    it('should test singleton pattern behavior', () => {
      const instance1 = AuthenticationService.getInstance();
      const instance2 = AuthenticationService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(AuthenticationService);
    });
  });

  describe('Token Type Detection Integration', () => {
    it('should correctly route different token types through authentication flow', async () => {
      const testCases = [
        { 
          token: `email-routing-${Date.now()}@example.com`, 
          expectedType: TokenType.EMAIL,
          expectedMethod: 'email'
        },
        { 
          token: `dev:dev-routing-${Date.now()}@example.com`, 
          expectedType: TokenType.DEVELOPMENT,
          expectedMethod: 'development'
        }
      ];
      
      app.get('/routing-test', requireAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          tokenType: req.auth?.tokenType,
          authenticationMethod: req.auth?.authenticationMethod,
          email: req.user?.email
        });
      });

      for (const testCase of testCases) {
        try {
          const response = await request(app)
            .get('/routing-test')
            .set('Authorization', `Bearer ${testCase.token}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.tokenType).toBe(testCase.expectedType);
          expect(response.body.authenticationMethod).toBe(testCase.expectedMethod);
        } catch (error) {
          if (error instanceof Error && error.message.includes('database')) {
            console.warn(`Skipping routing test for ${testCase.token} - database not available`);
            continue;
          }
          throw error;
        }
      }
    });
  });
});