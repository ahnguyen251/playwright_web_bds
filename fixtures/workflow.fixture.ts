import { pageTest } from './page.fixture';
import { AppointmentWorkflow } from '../workflows/appointments/AppointmentWorkflow';
import { AuthenticationWorkflow } from '../workflows/authentication/AuthenticationWorkflow';
import { LoginWorkflow } from '../workflows/authentication/LoginWorkflow';
import { PasswordRecoveryWorkflow } from '../workflows/authentication/PasswordRecoveryWorkflow';
import { ProfileWorkflow } from '../workflows/authentication/ProfileWorkflow';
import { RegistrationWorkflow } from '../workflows/authentication/RegistrationWorkflow';
import { ListingWorkflow } from '../workflows/listings/ListingWorkflow';
import { TransactionWorkflow } from '../workflows/transactions/TransactionWorkflow';

const systemClock = Object.freeze({ now: () => new Date() });

export interface WorkflowFixtures {
  readonly authenticationWorkflow: AuthenticationWorkflow;
  readonly loginWorkflow: LoginWorkflow;
  readonly registrationWorkflow: RegistrationWorkflow;
  readonly passwordRecoveryWorkflow: PasswordRecoveryWorkflow;
  readonly profileWorkflow: ProfileWorkflow;
  readonly listingWorkflow: ListingWorkflow;
  readonly appointmentWorkflow: AppointmentWorkflow;
  readonly transactionWorkflow: TransactionWorkflow;
}

export const workflowTest = pageTest.extend<WorkflowFixtures>({
  loginWorkflow: async ({ loginPage, header }, use) => use(new LoginWorkflow(loginPage, header)),
  registrationWorkflow: async ({ loginPage, registerPage, otpProvider, otpQueryPolicy }, use) =>
    use(
      new RegistrationWorkflow(loginPage, registerPage, otpProvider, otpQueryPolicy, systemClock),
    ),
  passwordRecoveryWorkflow: async (
    { loginPage, forgotPasswordPage, otpProvider, otpQueryPolicy },
    use,
  ) =>
    use(
      new PasswordRecoveryWorkflow(
        loginPage,
        forgotPasswordPage,
        otpProvider,
        otpQueryPolicy,
        systemClock,
      ),
    ),
  profileWorkflow: async ({ profilePage }, use) => use(new ProfileWorkflow(profilePage)),
  authenticationWorkflow: async ({ loginWorkflow, header }, use) =>
    use(new AuthenticationWorkflow(loginWorkflow, header)),
  listingWorkflow: async ({ listingListPage, createListingPage, myListingsPage }, use) =>
    use(new ListingWorkflow(listingListPage, createListingPage, myListingsPage)),
  appointmentWorkflow: async ({ listingDetailPage, appointmentPage }, use) =>
    use(new AppointmentWorkflow(listingDetailPage, appointmentPage)),
  transactionWorkflow: async ({ transactionPage }, use) =>
    use(new TransactionWorkflow(transactionPage)),
});
