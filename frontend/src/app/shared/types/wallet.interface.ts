export interface Wallet {
  balance: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  description?: string;
  relatedEventId?: string;
  adminUserId?: string;
  createdAt: string;

  relatedEvent?: { id: string; title: string };
}

export interface PaginatedTransactions {
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
}
