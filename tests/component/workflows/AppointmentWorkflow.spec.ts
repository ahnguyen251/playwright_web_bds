import { expect, test } from '@playwright/test';

import { AppointmentPage } from '../../../pages/appointments/AppointmentPage';
import { ListingDetailPage } from '../../../pages/listings/ListingDetailPage';
import { AppointmentDataFactory } from '../../../test-data/factories/AppointmentDataFactory';
import { AppointmentWorkflow } from '../../../workflows/appointments/AppointmentWorkflow';
import { appointmentFormFixture } from '../support/appointment-form.fixture';

test.beforeEach(async ({ page }) => {
  await page.route('**/listings/48', async (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: appointmentFormFixture(),
    }),
  );
});

test('resolves and prepares the earliest available appointment options', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);
  const workflow = new AppointmentWorkflow(new ListingDetailPage(page), appointmentPage);

  const selection = await workflow.prepareAppointment(AppointmentDataFactory.create(48));

  expect(selection).toEqual({
    dateLabel: 'Thứ 4 12 Tháng 8',
    timeSlotLabel: '10:00 - 11:00',
  });
  await expect(appointmentPage.submitButton).toBeEnabled();
});

test('rejects an unavailable exact appointment option descriptively', async ({ page }) => {
  const workflow = new AppointmentWorkflow(new ListingDetailPage(page), new AppointmentPage(page));
  const appointment = AppointmentDataFactory.create(48, {
    date: { strategy: 'exact', label: 'Thứ 6 14 Tháng 8' },
  });

  await expect(workflow.prepareAppointment(appointment)).rejects.toThrow(
    'Appointment date option is not available: Thứ 6 14 Tháng 8',
  );
});

test('prepares valid contact data without selecting a time slot', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);
  const workflow = new AppointmentWorkflow(new ListingDetailPage(page), appointmentPage);

  const dateLabel = await workflow.prepareAppointmentWithoutTime(AppointmentDataFactory.create(48));

  expect(dateLabel).toBe('Thứ 4 12 Tháng 8');
  await expect(appointmentPage.submitButton).toBeDisabled();
});
