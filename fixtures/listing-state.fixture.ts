import { workflowTest } from './workflow.fixture';
import { ListingReferenceFactory } from '../test-data/factories/ListingReferenceFactory';
import type { ControlledListingAlias, ListingReference } from '../types/listing.types';

export interface ListingStateFixtures {
  readonly controlledListing: (alias: ControlledListingAlias) => ListingReference;
}

export const listingStateTest = workflowTest.extend<ListingStateFixtures>({
  controlledListing: async ({}, use, testInfo) => {
    await use((alias) => {
      const reference = ListingReferenceFactory.get(alias);
      if (reference !== undefined) return reference;

      testInfo.skip(true, `Tin đăng được kiểm soát ${alias} chưa được cấu hình`);
      throw new Error(`Tin đăng được kiểm soát ${alias} chưa được cấu hình`);
    });
  },
});
