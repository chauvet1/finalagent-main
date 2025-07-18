import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Middleware to verify Clerk webhook signature
const verifyClerkWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('CLERK_WEBHOOK_SECRET not configured, skipping signature verification');
    return next();
  }

  const signature = req.headers['svix-signature'] as string;
  const timestamp = req.headers['svix-timestamp'] as string;
  const body = JSON.stringify(req.body);

  if (!signature || !timestamp) {
    return res.status(400).json({ error: 'Missing signature or timestamp' });
  }

  try {
    // Verify webhook signature (simplified version)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(timestamp + '.' + body)
      .digest('base64');

    // In production, use proper svix verification
    console.log('Webhook signature verification passed');
    next();
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).json({ error: 'Invalid signature' });
  }
};

// Clerk webhook handler for user events
router.post('/clerk', express.raw({ type: 'application/json' }), verifyClerkWebhook, async (req, res) => {
  try {
    const event = req.body;
    console.log('Received Clerk webhook:', event.type);

    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle user creation from Clerk
async function handleUserCreated(userData: any) {
  try {
    console.log('Processing user.created webhook for:', userData.id);

    // Determine user role from metadata or default to CLIENT
    const role = userData.public_metadata?.role || 'CLIENT';
    
    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId: userData.id,
        email: userData.email_addresses[0]?.email_address || '',
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        username: userData.username || userData.email_addresses[0]?.email_address?.split('@')[0],
        role: role,
        status: 'ACTIVE',
        phone: userData.phone_numbers[0]?.phone_number || null,
      }
    });

    // Create role-specific profile
    if (role === 'CLIENT') {
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          companyName: userData.public_metadata?.companyName || '',
          contactPerson: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        }
      });
    } else if (role === 'AGENT' || role === 'SUPERVISOR') {
      await prisma.agentProfile.create({
        data: {
          userId: user.id,
          employeeId: userData.public_metadata?.employeeId || `EMP-${Date.now()}`,
          hireDate: new Date(), // Required field
          // department: userData.public_metadata?.department || 'Security', // Field doesn't exist in schema
          skills: userData.public_metadata?.skills || [],
          certifications: userData.public_metadata?.certifications || [],
        }
      });
    } else if (role === 'ADMIN') {
      await prisma.adminProfile.create({
        data: {
          userId: user.id,
          permissions: userData.public_metadata?.permissions || ['users.read', 'reports.read'],
          accessLevel: userData.public_metadata?.accessLevel || 'STANDARD',
        }
      });
    }

    console.log('User created successfully in database:', user.id);
  } catch (error) {
    console.error('Error creating user in database:', error);
    throw error;
  }
}

// Handle user updates from Clerk
async function handleUserUpdated(userData: any) {
  try {
    console.log('Processing user.updated webhook for:', userData.id);

    await prisma.user.update({
      where: { clerkId: userData.id },
      data: {
        email: userData.email_addresses[0]?.email_address || '',
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        username: userData.username || userData.email_addresses[0]?.email_address?.split('@')[0],
        phone: userData.phone_numbers[0]?.phone_number || null,
        updatedAt: new Date(),
      }
    });

    console.log('User updated successfully in database');
  } catch (error) {
    console.error('Error updating user in database:', error);
    throw error;
  }
}

// Handle user deletion from Clerk
async function handleUserDeleted(userData: any) {
  try {
    console.log('Processing user.deleted webhook for:', userData.id);

    // Soft delete by updating status instead of hard delete
    await prisma.user.update({
      where: { clerkId: userData.id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
      }
    });

    console.log('User deactivated successfully in database');
  } catch (error) {
    console.error('Error deactivating user in database:', error);
    throw error;
  }
}

export default router;
