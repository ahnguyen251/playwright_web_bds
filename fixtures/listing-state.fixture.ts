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

      testInfo.skip(true, `Controlled listing ${alias} is not configured`);
      throw new Error(`Controlled listing ${alias} is not configured`);
    });
  },
});
