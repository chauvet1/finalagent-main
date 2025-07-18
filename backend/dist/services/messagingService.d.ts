import WebSocketService from './websocketService';
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    recipientId?: string;
    content: string;
    type: 'text' | 'image' | 'file' | 'location' | 'voice' | 'system';
    metadata: {
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        duration?: number;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
        thumbnailUrl?: string;
    };
    status: 'sent' | 'delivered' | 'read' | 'failed';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    isEncrypted: boolean;
    createdAt: Date;
    updatedAt: Date;
    editedAt?: Date;
    deletedAt?: Date;
    replyToId?: string;
    reactions: Array<{
        userId: string;
        emoji: string;
        timestamp: Date;
    }>;
}
export interface Conversation {
    id: string;
    type: 'private' | 'group' | 'broadcast' | 'emergency';
    name?: string;
    description?: string;
    participants: Array<{
        userId: string;
        role: 'member' | 'admin' | 'moderator';
        joinedAt: Date;
        lastReadAt?: Date;
        notificationSettings: {
            muted: boolean;
            muteUntil?: Date;
        };
    }>;
    settings: {
        allowFileSharing: boolean;
        allowVoiceMessages: boolean;
        maxParticipants: number;
        autoDeleteMessages: boolean;
        autoDeleteAfterDays?: number;
        requireApprovalToJoin: boolean;
    };
    metadata: {
        createdBy: string;
        lastMessageAt?: Date;
        messageCount: number;
        isArchived: boolean;
        tags: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface MessageDeliveryReceipt {
    messageId: string;
    userId: string;
    status: 'delivered' | 'read';
    timestamp: Date;
}
declare class MessagingService {
    private wsService;
    private encryptionKey;
    constructor(wsService: WebSocketService);
    sendMessage(senderId: string, conversationId: string, content: string, type?: Message['type'], metadata?: Message['metadata'], options?: {
        recipientId?: string;
        priority?: Message['priority'];
        replyToId?: string;
        encrypt?: boolean;
    }): Promise<Message>;
    createConversation(creatorId: string, type: Conversation['type'], participantIds: string[], options?: {
        name?: string;
        description?: string;
        settings?: Partial<Conversation['settings']>;
    }): Promise<Conversation>;
    addParticipant(conversationId: string, userId: string, newParticipantId: string, role?: 'member' | 'admin' | 'moderator'): Promise<void>;
    removeParticipant(conversationId: string, userId: string, participantId: string): Promise<void>;
    markMessageAsRead(userId: string, messageId: string): Promise<void>;
    addReaction(userId: string, messageId: string, emoji: string): Promise<void>;
    searchMessages(userId: string, query: string, filters?: {
        conversationId?: string;
        senderId?: string;
        type?: Message['type'];
        startDate?: Date;
        endDate?: Date;
    }, pagination?: {
        page: number;
        limit: number;
    }): Promise<{
        messages: Message[];
        total: number;
    }>;
    getConversationMessages(userId: string, conversationId: string, pagination?: {
        page: number;
        limit: number;
        before?: string;
    }): Promise<{
        messages: Message[];
        hasMore: boolean;
    }>;
    private deliverMessage;
    private handleUrgentMessage;
    private sendPushNotifications;
    private sendSystemMessage;
    private canUserAccessConversation;
    private canUserManageConversation;
    private encryptMessage;
    private decryptMessage;
    private storeMessage;
    private storeConversation;
    private updateConversation;
    private updateMessage;
    private getMessage;
    private getConversation;
    private getUserConversations;
    private updateConversationLastMessage;
    private updateLastReadAt;
    private storeDeliveryReceipt;
    private searchMessagesInDatabase;
    private getMessagesFromDatabase;
    private notifyConversationCreated;
}
export default MessagingService;
//# sourceMappingURL=messagingService.d.ts.map