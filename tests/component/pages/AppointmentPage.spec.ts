import { expect, test } from '@playwright/test';

import { AppointmentPage } from '../../../pages/appointments/AppointmentPage';
import type { AppointmentContactData } from '../../../types/appointment.types';
import { appointmentFormFixture } from '../support/appointment-form.fixture';

const validContact: AppointmentContactData = {
  fullName: 'Automation Appointment',
  phone: '0987654321',
  email: 'automation.appointment@gmail.com',
  note: 'Controlled component appointment',
};

test.beforeEach(async ({ page }) => {
  await page.setContent(appointmentFormFixture());
});

test('selects semantic date and time options and submits valid contact data', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  expect(await appointmentPage.availableDateLabels()).toEqual([
    'Thứ 4 12 Tháng 8',
    'Thứ 5 13 Tháng 8',
  ]);
  expect(await appointmentPage.availableTimeSlotLabels()).toEqual(['10:00 - 11:00']);

  await appointmentPage.selectDate('Thứ 5 13 Tháng 8');
  await appointmentPage.selectTimeSlot('10:00 - 11:00');
  await appointmentPage.fillContact(validContact);
  await appointmentPage.submitAppointment();

  await expect(appointmentPage.successHeading).toBeVisible();
  await expect(appointmentPage.formHeading).toBeHidden();
});

test('keeps submission disabled without a time slot', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  await appointmentPage.selectDate('Thứ 4 12 Tháng 8');
  await appointmentPage.fillContact(validContact);

  await expect(appointmentPage.submitButton).toBeDisabled();
});

test('rejects an exact disabled appointment date descriptively', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  await expect(appointmentPage.selectDate('Thứ 3 11 Tháng 8')).rejects.toThrow(
    'Appointment date option is disabled: Thứ 3 11 Tháng 8',
  );
});

test('rejects an exact disabled appointment time slot descriptively', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  await expect(appointmentPage.selectTimeSlot('09:00 - 10:00')).rejects.toThrow(
    'Appointment time slot option is disabled: 09:00 - 10:00',
  );
});

test('exposes the required contact name error', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  await appointmentPage.fillContact({ ...validContact, fullName: '' });

  await expect(appointmentPage.nameRequiredError).toBeVisible();
});

test('exposes the Vietnamese phone validation error', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  await appointmentPage.fillContact({ ...validContact, phone: '0101234567' });

  await expect(appointmentPage.phoneInvalidError).toBeVisible();
});

test('exposes the Gmail email validation error', async ({ page }) => {
  const appointmentPage = new AppointmentPage(page);

  await appointmentPage.fillContact({ ...validContact, email: 'automation@example.test' });

  await expect(appointmentPage.emailInvalidError).toBeVisible();
});
