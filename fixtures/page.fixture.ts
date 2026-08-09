import { authTest } from './auth.fixture';
import { AppointmentPage } from '../pages/appointments/AppointmentPage';
import { ForgotPasswordPage } from '../pages/authentication/ForgotPasswordPage';
import { LoginPage } from '../pages/authentication/LoginPage';
import { RegisterPage } from '../pages/authentication/RegisterPage';
import { HeaderComponent } from '../pages/components/HeaderComponent';
import { CreateListingPage } from '../pages/listings/CreateListingPage';
import { EditListingPage } from '../pages/listings/EditListingPage';
import { FavoritesPage } from '../pages/listings/FavoritesPage';
import { ListingDetailPage } from '../pages/listings/ListingDetailPage';
import { ListingListPage } from '../pages/listings/ListingListPage';
import { MyListingsPage } from '../pages/listings/MyListingsPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { TransactionPage } from '../pages/transactions/TransactionPage';

export interface PageFixtures {
  readonly header: HeaderComponent;
  readonly loginPage: LoginPage;
  readonly registerPage: RegisterPage;
  readonly forgotPasswordPage: ForgotPasswordPage;
  readonly profilePage: ProfilePage;
  readonly listingListPage: ListingListPage;
  readonly listingDetailPage: ListingDetailPage;
  readonly createListingPage: CreateListingPage;
  readonly editListingPage: EditListingPage;
  readonly favoritesPage: FavoritesPage;
  readonly myListingsPage: MyListingsPage;
  readonly appointmentPage: AppointmentPage;
  readonly transactionPage: TransactionPage;
}

export const pageTest = authTest.extend<PageFixtures>({
  header: async ({ page }, use) => use(new HeaderComponent(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  forgotPasswordPage: async ({ page }, use) => use(new ForgotPasswordPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  listingListPage: async ({ page }, use) => use(new ListingListPage(page)),
  listingDetailPage: async ({ page }, use) => use(new ListingDetailPage(page)),
  createListingPage: async ({ page }, use) => use(new CreateListingPage(page)),
  editListingPage: async ({ page }, use) => use(new EditListingPage(page)),
  favoritesPage: async ({ page }, use) => use(new FavoritesPage(page)),
  myListingsPage: async ({ page }, use) => use(new MyListingsPage(page)),
  appointmentPage: async ({ page }, use) => use(new AppointmentPage(page)),
  transactionPage: async ({ page }, use) => use(new TransactionPage(page)),
});
