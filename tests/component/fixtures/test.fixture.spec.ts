import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';
import { ListingWorkflow } from '../../../workflows/listings/ListingWorkflow';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { FavoritesPage } from '../../../pages/listings/FavoritesPage';
import { expect, test } from '../../../fixtures/test.fixture';

test('BaseTest composition provides real Page Objects and Workflows', ({
  loginPage,
  authenticationWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(authenticationWorkflow).toBeInstanceOf(AuthenticationWorkflow);
});

test('cung cấp đầy đủ Page, Workflow và bộ phân giải trạng thái tin kiểm soát', ({
  favoritesPage,
  listingWorkflow,
  controlledListing,
}) => {
  expect(favoritesPage).toBeInstanceOf(FavoritesPage);
  expect(listingWorkflow).toBeInstanceOf(ListingWorkflow);
  expect(controlledListing).toBeInstanceOf(Function);
});
