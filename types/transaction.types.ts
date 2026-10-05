export type TransactionStatus = 'all' | 'successful' | 'processing' | 'failed' | 'expired';

export interface TransactionFilter {
  readonly listingName?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly status?: TransactionStatus;
}

export interface TransactionItem {
  readonly txnRef: string;
  readonly packageName: string;
  readonly listingTitle: string;
  readonly amount: string;
  readonly duration: string;
  readonly paymentMethod: string;
  readonly transactionTime: string;
  readonly status: string;
}

