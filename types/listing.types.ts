export type TransactionType = 'sale' | 'rent';

export interface ListingData {
  readonly title: string;
  readonly transactionType: TransactionType;
  readonly propertyType: string;
  readonly address: string;
  readonly price: number;
  readonly area: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly description: string;
  readonly imagePaths: readonly string[];
}

export interface ListingSearchCriteria {
  readonly keyword?: string;
  readonly transactionType?: TransactionType;
  readonly propertyType?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
}
