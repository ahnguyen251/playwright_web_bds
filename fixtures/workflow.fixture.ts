import { pageTest } from './page.fixture';
import { AppointmentWorkflow } from '../workflows/appointments/AppointmentWorkflow';
import { AuthenticationWorkflow } from '../workflows/authentication/AuthenticationWorkflow';
import { ListingWorkflow } from '../workflows/listings/ListingWorkflow';
import { TransactionWorkflow } from '../workflows/transactions/TransactionWorkflow';

export interface WorkflowFixtures {
  readonly authenticationWorkflow: AuthenticationWorkflow;
  readonly listingWorkflow: ListingWorkflow;
  readonly appointmentWorkflow: AppointmentWorkflow;
  readonly transactionWorkflow: TransactionWorkflow;
}

export const workflowTest = pageTest.extend<WorkflowFixtures>({
  authenticationWorkflow: async ({ loginPage, header }, use) =>
    use(new AuthenticationWorkflow(loginPage, header)),
  listingWorkflow: async (
    {
      listingListPage,
      listingDetailPage,
      createListingPage,
      editListingPage,
      myListingsPage,
      favoritesPage,
    },
    use,
  ) =>
    use(
      new ListingWorkflow(
        listingListPage,
        listingDetailPage,
        createListingPage,
        editListingPage,
        myListingsPage,
        favoritesPage,
      ),
    ),
  appointmentWorkflow: async ({ listingDetailPage, appointmentPage }, use) =>
    use(new AppointmentWorkflow(listingDetailPage, appointmentPage)),
  transactionWorkflow: async ({ transactionPage }, use) =>
    use(new TransactionWorkflow(transactionPage)),
});
