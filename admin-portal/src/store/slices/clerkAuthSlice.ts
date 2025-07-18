import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define compatible types for Clerk user and session
interface ClerkUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: string | null; // Store only the email string
  primaryPhoneNumber?: string | null;  // Store only the phone string
  imageUrl?: string | null;
  publicMetadata?: Record<string, unknown>; // Ensure this is serializable
  createdAt?: string | null; // ISO string
  lastSignInAt?: string | null; // ISO string
}

interface ClerkSession {
  id: string;
  expireAt: string; // ISO string
  // getToken should NOT be stored in Redux
}

interface ClerkAuthState {
  user: ClerkUser | null;
  session: ClerkSession | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  organizationId: string | null;
  role: string | null;
  permissions: string[];
}

const initialState: ClerkAuthState = {
  user: null,
  session: null,
  isLoaded: false,
  isSignedIn: false,
  isLoading: false,
  error: null,
  organizationId: null,
  role: null,
  permissions: [],
};

/**
 * Clerk Authentication Slice
 * Manages Clerk authentication state in Redux store
 */
const clerkAuthSlice = createSlice({
  name: 'clerkAuth',
  initialState,
  reducers: {
    setClerkUser: (state, action: PayloadAction<unknown>) => {
      const user = action.payload as any; // Type assertion for Clerk user object
      if (user) {
        // Ensure we only store serializable data
        const serializedUser: ClerkUser = {
          id: user.id || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          username: user.username || null,
          imageUrl: user.imageUrl || undefined,
          // Handle email - extract just the string
          primaryEmailAddress: user.primaryEmailAddress?.emailAddress || 
                             (typeof user.primaryEmailAddress === 'string' ? user.primaryEmailAddress : null),
          // Handle phone - extract just the string
          primaryPhoneNumber: user.primaryPhoneNumber?.phoneNumber || 
                             (typeof user.primaryPhoneNumber === 'string' ? user.primaryPhoneNumber : null),
          // Convert dates to ISO strings
          createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
          lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
          // Ensure publicMetadata is serializable
          publicMetadata: user.publicMetadata ? { ...user.publicMetadata } : undefined
        };

        state.user = serializedUser;
        state.isSignedIn = true;

        // Safely extract role and permissions from metadata
        const publicMetadata = (user.publicMetadata || {}) as Record<string, unknown>;
        state.role = (typeof publicMetadata.role === 'string' ? publicMetadata.role : 'user');
        state.permissions = Array.isArray(publicMetadata.permissions) 
          ? [...publicMetadata.permissions].filter(p => typeof p === 'string')
          : [];
        state.organizationId = typeof publicMetadata.organizationId === 'string' 
          ? publicMetadata.organizationId 
          : null;
      } else {
        state.user = null;
        state.isSignedIn = false;
        state.role = null;
        state.permissions = [];
        state.organizationId = null;
      }    
    },

    setClerkSession: (state, action: PayloadAction<any>) => {
      const session = action.payload;
      if (session) {
        state.session = {
          id: session.id,
          expireAt: session.expireAt ? new Date(session.expireAt).toISOString() : '',
        };
      } else {
        state.session = null;
      }
    },

    setClerkLoaded: (state, action: PayloadAction<boolean>) => {
      state.isLoaded = action.payload;
    },

    setClerkLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setClerkError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearClerkError: (state) => {
      state.error = null;
    },

    updateUserRole: (state, action: PayloadAction<{ role: string; permissions: string[] }>) => {
      state.role = action.payload.role;
      state.permissions = action.payload.permissions;
    },

    setOrganization: (state, action: PayloadAction<string | null>) => {
      state.organizationId = action.payload;
    },

    clearClerkAuth: (state) => {
      state.user = null;
      state.session = null;
      state.isSignedIn = false;
      state.role = null;
      state.permissions = [];
      state.organizationId = null;
      state.error = null;
    },
  },
});

export const {
  setClerkUser,
  setClerkSession,
  setClerkLoaded,
  setClerkLoading,
  setClerkError,
  clearClerkError,
  updateUserRole,
  setOrganization,
  clearClerkAuth,
} = clerkAuthSlice.actions;

export default clerkAuthSlice.reducer;
