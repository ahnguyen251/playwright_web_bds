import type {
  ListingData,
  ListingDetailSnapshot,
  ListingFilterCriteria,
  ListingReference,
  ListingSearchCriteria,
  ListingStatus,
  ListingSummary,
  TransactionType,
} from '../../types/listing.types';
import type { CreateListingPage } from '../../pages/listings/CreateListingPage';
import type { EditListingPage } from '../../pages/listings/EditListingPage';
import type { FavoritesPage } from '../../pages/listings/FavoritesPage';
import type { ListingDetailPage } from '../../pages/listings/ListingDetailPage';
import type { ListingListPage } from '../../pages/listings/ListingListPage';
import type { MyListingsPage } from '../../pages/listings/MyListingsPage';

export class ListingWorkflow {
  private withdrawalReference: ListingReference | undefined;

  public constructor(
    private readonly listingListPage: ListingListPage,
    private readonly listingDetailPage: ListingDetailPage,
    private readonly createListingPage: CreateListingPage,
    private readonly editListingPage: EditListingPage,
    private readonly myListingsPage: MyListingsPage,
    private readonly favoritesPage: FavoritesPage,
  ) {}

  public async search(
    transactionType: TransactionType,
    criteria: ListingSearchCriteria,
  ): Promise<readonly ListingSummary[]> {
    await this.listingListPage.open(transactionType);
    await this.listingListPage.search(criteria);
    return this.listingListPage.summaries();
  }

  public async filter(
    transactionType: TransactionType,
    criteria: ListingFilterCriteria,
  ): Promise<readonly ListingSummary[]> {
    await this.listingListPage.open(transactionType);
    await this.listingListPage.applyFilters(criteria);
    return this.listingListPage.summaries();
  }

  public async viewDetail(reference: ListingReference): Promise<ListingDetailSnapshot> {
    await this.listingDetailPage.open(reference);
    return this.listingDetailPage.snapshot();
  }

  public async viewOwnListings(): Promise<readonly ListingSummary[]> {
    await this.myListingsPage.open();
    return this.myListingsPage.summaries();
  }

  public async create(data: ListingData): Promise<ListingStatus> {
    await this.createListingPage.open();
    await this.createListingPage.submit(data);
    return this.createListingPage.status();
  }

  public async edit(reference: ListingReference, data: ListingData): Promise<ListingStatus> {
    await this.myListingsPage.open();
    await this.myListingsPage.openEdit(reference);
    await this.editListingPage.update(data);
    return this.editListingPage.status();
  }

  public async requestWithdrawal(reference: ListingReference): Promise<void> {
    await this.myListingsPage.open();
    await this.myListingsPage.requestWithdraw(reference);
    this.withdrawalReference = reference;
  }

  public async cancelWithdrawal(): Promise<void> {
    await this.myListingsPage.cancelWithdraw();
    this.withdrawalReference = undefined;
  }

  public async confirmWithdrawal(): Promise<ListingStatus> {
    const reference = this.requireWithdrawalReference();
    await this.myListingsPage.confirmWithdraw();
    const status = await this.myListingsPage.statusOf(reference);
    this.withdrawalReference = undefined;
    return status;
  }

  public async toggleFavorite(reference: ListingReference): Promise<boolean> {
    await this.listingDetailPage.open(reference);
    await this.listingDetailPage.toggleFavorite();
    return this.listingDetailPage.favoriteState();
  }

  public async isFavoriteListed(reference: ListingReference): Promise<boolean> {
    await this.favoritesPage.open();
    return this.favoritesPage.contains(reference.title);
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

  public async ownedListingStatus(reference: ListingReference): Promise<ListingStatus> {
    return this.myListingsPage.statusOf(reference);
  }

  private requireWithdrawalReference(): ListingReference {
    if (this.withdrawalReference === undefined) {
      throw new Error('No listing withdrawal is pending confirmation');
    }
    return this.withdrawalReference;
  }
}
