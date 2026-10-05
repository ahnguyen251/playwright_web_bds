import { expect, test } from '../../fixtures/test.fixture';
import { transactionCaseTitle } from '../../test-cases/transactions/transaction.test-cases';

test.describe('Transaction History Read-Only Scenarios', () => {
  test.use({ storageState: '.auth/defaultUser.json' });

  test(
    transactionCaseTitle('TC-TRANS-VIEW-001'),
    async ({ transactionPage }) => {
      await transactionPage.open();

      await expect(transactionPage.heading).toBeVisible();

      const headers = await transactionPage.getHeaderLabels();
      expect(headers).toEqual([
        'Mã giao dịch',
        'Gói tin',
        'Tin đăng',
        'Số tiền',
        'Thời hạn',
        'Phương thức',
        'Thời gian',
        'Trạng thái',
      ]);

      await expect.poll(async () => transactionPage.getRowCount()).toBeGreaterThan(0);

      const isSorted = await transactionPage.isDateSortedDescending();
      expect(isSorted).toBe(true);

      const firstTxn = await transactionPage.getTransactionData(0);
      expect(firstTxn.txnRef).toMatch(/^(PFY\d+|#\d+)$/);
      expect(firstTxn.packageName).toMatch(/^(Ruby|Gold|Diamond|Tin thường|Gói tin)$/);
      expect(firstTxn.amount).toMatch(/\d+([.,]\d+)?\s*đ/);
      expect(firstTxn.duration).toMatch(/\d+\s*ngày/);
      expect(firstTxn.paymentMethod).toBe('VNPAY');
      expect(firstTxn.status).toMatch(/^(Thành công|Đang xử lý|Thất bại|Hết hạn)$/);
    },
  );

  test(
    transactionCaseTitle('TC-TRANS-FILTER-001'),
    async ({ transactionPage }) => {
      await transactionPage.open();

      await transactionPage.filterByStatus('successful');

      await expect.poll(async () => transactionPage.getRowCount()).toBeGreaterThan(0);
      const successRowCount = await transactionPage.getRowCount();

      for (let i = 0; i < successRowCount; i++) {
        const txn = await transactionPage.getTransactionData(i);
        expect(txn.status).toBe('Thành công');
      }

      await transactionPage.searchByKeyword('cho thuê 02');
      await expect.poll(async () => transactionPage.getRowCount()).toBe(1);

      const item = await transactionPage.getTransactionData(0);
      expect(item.listingTitle.toLowerCase()).toContain('cho thuê 02');
      expect(item.packageName).toBe('Ruby');
      expect(item.duration).toBe('7 ngày');
      expect(item.amount).toBe('840.000 đ');

      await transactionPage.clearKeyword();
      await transactionPage.filterByStatus('all');

      await expect.poll(async () => transactionPage.getRowCount()).toBeGreaterThanOrEqual(successRowCount);
    },
  );
});
