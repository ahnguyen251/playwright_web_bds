import type { UserCredentials } from '../../types/user.types';
import type { HeaderComponent } from '../../pages/components/HeaderComponent';
import type { LoginPage } from '../../pages/authentication/LoginPage';
import { LoginWorkflow } from './LoginWorkflow';

export class AuthenticationWorkflow {
  private readonly loginWorkflow: LoginWorkflow;

  public constructor(
    loginWorkflowOrPage: LoginWorkflow | LoginPage,
    private readonly header: HeaderComponent,
  ) {
    this.loginWorkflow =
      loginWorkflowOrPage instanceof LoginWorkflow
        ? loginWorkflowOrPage
        : new LoginWorkflow(loginWorkflowOrPage, header);
  }

  public async login(credentials: UserCredentials): Promise<void> {
    await this.loginWorkflow.login(credentials);
  }

  public async logout(): Promise<void> {
    await this.header.logout();
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.header.isAuthenticated();
  }
}
