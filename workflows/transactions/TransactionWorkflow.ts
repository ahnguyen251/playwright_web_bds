import type { TransactionFilter } from '../../types/transaction.types';
import type { TransactionPage } from '../../pages/transactions/TransactionPage';

export class TransactionWorkflow {
  public constructor(private readonly transactionPage: TransactionPage) {}

  public async viewHistory(filter: TransactionFilter = {}): Promise<void> {
    await this.transactionPage.open();
    await this.transactionPage.applyFilter(filter);
  }
}
