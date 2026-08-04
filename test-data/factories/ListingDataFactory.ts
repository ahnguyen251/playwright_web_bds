import defaultListing from '../static/listing.json';
import type { ListingData, TransactionType } from '../../types/listing.types';

const transactionTypes = new Set<TransactionType>(['sale', 'rent']);

const validateListing = (listing: ListingData): void => {
  if (!listing.title.trim()) {
    throw new Error('Listing title is required');
  }
  if (!transactionTypes.has(listing.transactionType)) {
    throw new Error('Listing transaction type is invalid');
  }
  if (listing.price <= 0) {
    throw new Error('Listing price must be positive');
  }
  if (listing.area <= 0) {
    throw new Error('Listing area must be positive');
  }
  if (listing.bedrooms < 0 || listing.bathrooms < 0) {
    throw new Error('Listing room counts cannot be negative');
  }
};

export class ListingDataFactory {
  public static create(overrides: Partial<ListingData> = {}): ListingData {
    const listing: ListingData = {
      ...defaultListing,
      transactionType: defaultListing.transactionType as TransactionType,
      ...overrides,
      imagePaths: [...(overrides.imagePaths ?? defaultListing.imagePaths)],
    };

    validateListing(listing);
    return Object.freeze({ ...listing, imagePaths: Object.freeze([...listing.imagePaths]) });
  }
}
