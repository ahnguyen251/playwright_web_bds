import type { ListingData, ListingSearchCriteria, TransactionType } from '../../types/listing.types';
import type { CreateListingPage } from '../../pages/listings/CreateListingPage';
import type { ListingListPage } from '../../pages/listings/ListingListPage';
import type { MyListingsPage } from '../../pages/listings/MyListingsPage';

export class ListingWorkflow {
  public constructor(
    private readonly listingListPage: ListingListPage,
    private readonly createListingPage: CreateListingPage,
    private readonly myListingsPage: MyListingsPage,
  ) {}

  public async search(
    transactionType: TransactionType,
    criteria: ListingSearchCriteria,
  ): Promise<void> {
    await this.listingListPage.open(transactionType);
    await this.listingListPage.search(criteria);
  }

  public async prepareDraft(data: ListingData): Promise<void> {
    await this.createListingPage.open();
    await this.createListingPage.createDraft(data);
  }

  public async publishPreparedDraft(): Promise<void> {
    await this.createListingPage.publish();
  }

  public async openMyListings(): Promise<void> {
    await this.myListingsPage.open();
  }
}
