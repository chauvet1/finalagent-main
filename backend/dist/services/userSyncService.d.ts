import { UserRole, UserStatus } from '@prisma/client';
interface AuthenticatedUser {
    id: string;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    status: UserStatus;
    permissions?: string[];
    accessLevel?: string;
    profileData?: {
        adminProfile?: any;
        clientProfile?: any;
        agentProfile?: any;
    };
}
export declare class UserSyncService {
    private static prisma;
    private static clerkClient;
    static getUserWithSync(clerkUserId: string): Promise<AuthenticatedUser | null>;
    private static syncUserFromClerk;
    private static determineUserRole;
    private static createUserProfile;
    static updateUserFromClerk(clerkUserId: string): Promise<AuthenticatedUser | null>;
    static cleanupInactiveUsers(daysInactive?: number): Promise<number>;
}
export {};
//# sourceMappingURL=userSyncService.d.ts.map