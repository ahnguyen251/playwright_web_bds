import type { ControlledListingAlias, ListingReference } from '../../types/listing.types';

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const referenceKeys = Object.freeze({
  approved: ['LISTING_APPROVED_ID', 'LISTING_APPROVED_TITLE'],
  approvedWithoutMedia: ['LISTING_NO_MEDIA_ID', 'LISTING_NO_MEDIA_TITLE'],
  unapproved: ['LISTING_UNAPPROVED_ID', 'LISTING_UNAPPROVED_TITLE'],
  ownedEditable: ['LISTING_OWNED_EDITABLE_ID', 'LISTING_OWNED_EDITABLE_TITLE'],
  ownedPublishedCancel: [
    'LISTING_OWNED_PUBLISHED_CANCEL_ID',
    'LISTING_OWNED_PUBLISHED_CANCEL_TITLE',
  ],
  ownedPublishedWithdraw: [
    'LISTING_OWNED_PUBLISHED_WITHDRAW_ID',
    'LISTING_OWNED_PUBLISHED_WITHDRAW_TITLE',
  ],
  otherOwner: ['LISTING_OTHER_OWNER_ID', 'LISTING_OTHER_OWNER_TITLE'],
} satisfies Record<ControlledListingAlias, readonly [string, string]>);

export class ListingReferenceFactory {
  public static get(
    alias: ControlledListingAlias,
    source: EnvironmentSource = process.env,
  ): ListingReference | undefined {
    const [idKey, titleKey] = referenceKeys[alias];
    const id = source[idKey]?.trim();
    const title = source[titleKey]?.trim();

    if (!id || !title) return undefined;
    return Object.freeze({ id, title });
  }
}
