export interface Notification {
 id: string;
 userId: string;
 type: string;
 title: string;
 body: string;
 isRead: boolean;
 relatedEventId?: string;
 createdAt: string;
}

export interface PaginatedNotifications {
 data: Notification[];
 total: number;
 page: number;
 limit: number;
}
