import defaultListing from '../static/listing.json';
import { LISTING_UI_LIMITS } from '../../constants/listings';
import type {
  ListingContact,
  ListingData,
  ListingLocation,
  ListingMedia,
  TransactionType,
} from '../../types/listing.types';

type ListingDataOverrides = Omit<
  Partial<ListingData>,
  'location' | 'contact' | 'media' | 'amenities'
> & {
  readonly location?: Partial<ListingLocation>;
  readonly contact?: Partial<ListingContact>;
  readonly media?: Partial<ListingMedia>;
  readonly amenities?: readonly string[];
};

const transactionTypes = new Set<TransactionType>(['sale', 'rent']);
let uniqueTitleSequence = 0;

const validateListing = (listing: ListingData): void => {
  if (!listing.title.trim()) throw new Error('Listing title is required');
  if (listing.title.length > LISTING_UI_LIMITS.titleCharacters) {
    throw new Error(
      `Listing title cannot exceed ${String(LISTING_UI_LIMITS.titleCharacters)} characters`,
    );
  }
  if (!listing.description.trim()) throw new Error('Listing description is required');
  if (listing.description.length > LISTING_UI_LIMITS.descriptionCharacters) {
    throw new Error(
      `Listing description cannot exceed ${String(LISTING_UI_LIMITS.descriptionCharacters)} characters`,
    );
  }
  if (!transactionTypes.has(listing.transactionType)) {
    throw new Error('Listing transaction type is invalid');
  }
  if (listing.price <= 0) throw new Error('Listing price must be positive');
  if (listing.area <= 0) throw new Error('Listing area must be positive');
  if (listing.bedrooms < 0 || listing.bathrooms < 0) {
    throw new Error('Listing room counts cannot be negative');
  }
  if (listing.media.imagePaths.length > LISTING_UI_LIMITS.maximumImages) {
    throw new Error(
      `Listing cannot contain more than ${String(LISTING_UI_LIMITS.maximumImages)} images`,
    );
  }
};

const freezeListing = (listing: ListingData): ListingData =>
  Object.freeze({
    ...listing,
    location: Object.freeze({ ...listing.location }),
    contact: Object.freeze({ ...listing.contact }),
    amenities: Object.freeze([...listing.amenities]),
    media: Object.freeze({
      ...listing.media,
      imagePaths: Object.freeze([...listing.media.imagePaths]),
    }),
  });

export class ListingDataFactory {
  public static create(overrides: ListingDataOverrides = {}): ListingData {
    const {
      location: locationOverrides,
      contact: contactOverrides,
      media: mediaOverrides,
      amenities: amenityOverrides,
      ...scalarOverrides
    } = overrides;
    const media = {
      ...defaultListing.media,
      ...mediaOverrides,
      imagePaths: [...(mediaOverrides?.imagePaths ?? defaultListing.media.imagePaths)],
    };
    const listing: ListingData = {
      ...defaultListing,
      transactionType: defaultListing.transactionType as TransactionType,
      furnishing: defaultListing.furnishing as NonNullable<ListingData['furnishing']>,
      ...scalarOverrides,
      contact: {
        ...defaultListing.contact,
        role: defaultListing.contact.role as ListingContact['role'],
        ...contactOverrides,
      },
      location: { ...defaultListing.location, ...locationOverrides },
      amenities: [...(amenityOverrides ?? defaultListing.amenities)],
      media,
    };

    validateListing(listing);
    return freezeListing(listing);
  }

  public static uniqueTitle(prefix = 'AUTOMATION LISTING'): string {
    uniqueTitleSequence += 1;
    const suffix = `${Date.now().toString(36)}-${uniqueTitleSequence.toString(36)}`;
    const normalizedPrefix = prefix.trim() || 'AUTOMATION LISTING';
    const maximumPrefixLength = LISTING_UI_LIMITS.titleCharacters - suffix.length - 1;
    return `${normalizedPrefix.slice(0, maximumPrefixLength)}-${suffix}`;
  }

  public static boundaryText(length: number): string {
    if (!Number.isInteger(length) || length < 0) {
      throw new Error('Boundary length cannot be negative');
    }
    return 'K'.repeat(length);
  }
}
