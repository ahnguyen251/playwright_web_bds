export type TransactionStatus = 'all' | 'successful' | 'processing' | 'failed' | 'expired';

export interface TransactionFilter {
  readonly listingName?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly status?: TransactionStatus;
}
