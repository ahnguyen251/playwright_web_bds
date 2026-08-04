import type { UserCredentials } from '../../types/user.types';
import type { HeaderComponent } from '../../pages/components/HeaderComponent';
import type { LoginPage } from '../../pages/authentication/LoginPage';

export class AuthenticationWorkflow {
  public constructor(
    private readonly loginPage: LoginPage,
    private readonly header: HeaderComponent,
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
