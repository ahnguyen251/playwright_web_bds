import { expect, test } from '@playwright/test';

import type { MyListingsPage } from '../../../../pages/listings/MyListingsPage';
import type { ListingReference } from '../../../../types/listing.types';
import { ListingWorkflow } from '../../../../workflows/listings/ListingWorkflow';

const reference: ListingReference = Object.freeze({ id: '91', title: 'Controlled listing' });

const workflowWith = (myListingsPage: Partial<MyListingsPage>): ListingWorkflow =>
  new ListingWorkflow(
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    myListingsPage as MyListingsPage,
    undefined as never,
  );

test('does not record a pending withdrawal when the dialog did not open', async () => {
  const workflow = workflowWith({
    open: async () => undefined,
    requestWithdraw: async () => false,
  });

  await expect(workflow.requestWithdrawal(reference)).rejects.toThrow(
    'Listing withdrawal is unavailable',
  );
  await expect(workflow.confirmWithdrawal()).rejects.toThrow(
    'No listing withdrawal is pending confirmation',
  );
});

test('records a pending withdrawal only after the dialog opens', async () => {
  const workflow = workflowWith({
    open: async () => undefined,
    requestWithdraw: async () => true,
    confirmWithdraw: async () => undefined,
    statusOf: async () => 'Đã gỡ',
  });

  await workflow.requestWithdrawal(reference);

  expect(await workflow.confirmWithdrawal()).toBe('Đã gỡ');
});
