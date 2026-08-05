import type { LoginPage } from '../../pages/authentication/LoginPage';
import type { HeaderComponent } from '../../pages/components/HeaderComponent';
import type { UserCredentials } from '../../types/user.types';

type LoginPagePort = Pick<LoginPage, 'openHome' | 'open' | 'submitCredentials'>;
type AuthenticationHeaderPort = Pick<
  HeaderComponent,
  'waitForAuthenticated' | 'logout' | 'isAuthenticated'
>;

export class LoginWorkflow {
  public constructor(
    private readonly loginPage: LoginPagePort,
    private readonly header: AuthenticationHeaderPort,
  ) {}

  public async login(credentials: UserCredentials): Promise<void> {
    await this.loginPage.openHome();
    await this.loginPage.open();
    await this.loginPage.submitCredentials(credentials);
    await this.header.waitForAuthenticated();
  }

  public async logout(): Promise<void> {
    await this.header.logout();
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.header.isAuthenticated();
  }
}
