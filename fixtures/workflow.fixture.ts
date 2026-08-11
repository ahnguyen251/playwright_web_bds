import { pageTest } from './page.fixture';
import { loadProductionRegistrationConfig } from '../config/registration.config';
import { GmailApiClient } from '../helpers/otp/GmailApiClient';
import { GmailOtpProvider } from '../helpers/otp/GmailOtpProvider';
import type { OtpProvider } from '../types/otp.types';
import { AppointmentWorkflow } from '../workflows/appointments/AppointmentWorkflow';
import { AuthenticationWorkflow } from '../workflows/authentication/AuthenticationWorkflow';
import { RegistrationWorkflow } from '../workflows/authentication/RegistrationWorkflow';
import { ListingWorkflow } from '../workflows/listings/ListingWorkflow';
import { TransactionWorkflow } from '../workflows/transactions/TransactionWorkflow';

export interface WorkflowFixtures {
  readonly authenticationWorkflow: AuthenticationWorkflow;
  readonly otpProvider: OtpProvider;
  readonly registrationWorkflow: RegistrationWorkflow;
  readonly listingWorkflow: ListingWorkflow;
  readonly appointmentWorkflow: AppointmentWorkflow;
  readonly transactionWorkflow: TransactionWorkflow;
}

export const workflowTest = pageTest.extend<WorkflowFixtures>({
  authenticationWorkflow: async ({ loginPage, header }, use) =>
    use(new AuthenticationWorkflow(loginPage, header)),
  otpProvider: async ({}, use) => {
    const registrationConfig = loadProductionRegistrationConfig();
    const gmailClient = new GmailApiClient(registrationConfig.gmail);
    await use(new GmailOtpProvider(gmailClient, registrationConfig.gmail));
  },
  registrationWorkflow: async ({ registerPage, header, otpProvider }, use) =>
    use(new RegistrationWorkflow(registerPage, header, otpProvider)),
  listingWorkflow: async ({ listingListPage, createListingPage, myListingsPage }, use) =>
    use(new ListingWorkflow(listingListPage, createListingPage, myListingsPage)),
  appointmentWorkflow: async ({ listingDetailPage, appointmentPage }, use) =>
    use(new AppointmentWorkflow(listingDetailPage, appointmentPage)),
  transactionWorkflow: async ({ transactionPage }, use) =>
    use(new TransactionWorkflow(transactionPage)),
});
