export type TransactionType = 'sale' | 'rent';

export interface ListingMedia {
  readonly imagePaths: readonly string[];
  readonly videoPath?: string;
}

export interface ListingLocation {
  readonly province: string;
  readonly ward: string;
  readonly street: string;
  readonly addressLine: string;
}

export interface ListingContact {
  readonly role: 'owner' | 'broker';
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
}

export interface ListingData {
  readonly transactionType: TransactionType;
  readonly title: string;
  readonly description: string;
  readonly propertyType: string;
  readonly price: number;
  readonly negotiable: boolean;
  readonly area: number;
  readonly location: ListingLocation;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly frontage?: number;
  readonly depth?: number;
  readonly floorNumber?: number;
  readonly floors?: number;
  readonly houseDirection?: string;
  readonly balconyDirection?: string;
  readonly balconies?: number;
  readonly furnishing?: 'furnished' | 'basic' | 'unfurnished';
  readonly amenities: readonly string[];
  readonly contact: ListingContact;
  readonly media: ListingMedia;
}

export interface ListingReference {
  readonly id: string;
  readonly title: string;
}

export type ControlledListingAlias =
  | 'approved'
  | 'approvedWithoutMedia'
  | 'unapproved'
  | 'ownedEditable'
  | 'ownedPublishedCancel'
  | 'ownedPublishedWithdraw'
  | 'otherOwner';

export type ListingStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Đang đăng' | 'Đã gỡ';

export type ListingFormField =
  | 'title'
  | 'description'
  | 'price'
  | 'area'
  | 'street'
  | 'addressLine'
  | 'contactName'
  | 'contactPhone'
  | 'contactEmail';

export type ListingRangeField = 'priceFrom' | 'priceTo' | 'areaFrom' | 'areaTo';

export type ListingRangeSelection =
  | { readonly kind: 'preset'; readonly label: string }
  | { readonly kind: 'custom'; readonly from: number; readonly to: number };

export interface ListingSearchCriteria {
  readonly keyword?: string;
  readonly sortLabel?: string;
}

export interface ListingFilterCriteria {
  readonly poster?: 'all' | 'owner' | 'broker';
  readonly price?: ListingRangeSelection;
  readonly area?: ListingRangeSelection;
}

export interface ListingSummary {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly price?: number;
  readonly priceText: string;
  readonly area: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly poster: 'owner' | 'broker';
}

export interface ListingDetailSnapshot {
  readonly title: string;
  readonly description: string;
  readonly contactName: string;
  readonly amenities: readonly string[];
  readonly mediaCount: number;
  readonly usesDefaultImage: boolean;
  readonly relatedTitles: readonly string[];
  readonly viewCountText: string;
}

export interface ListingFormSnapshot {
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly area: number;
  readonly contactName: string;
  readonly imageCount: number;
  readonly hasVideo: boolean;
}
