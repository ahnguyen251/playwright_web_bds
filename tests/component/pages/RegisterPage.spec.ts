import { expect, test, type Page } from '@playwright/test';

import { RegisterPage } from '../../../pages/authentication/RegisterPage';
import {
  expiredRegistrationOtpFeedbackTestCase,
  incorrectRegistrationOtpFeedbackTestCase,
  registrationOtpEntryContractTestCase,
} from '../../../test-cases/authentication/registration.test-cases';

const readValidationPromptly = async (readMessages: () => Promise<string[]>): Promise<string[]> => {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      readMessages(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('Validation messages did not settle promptly.'));
        }, 500);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

async function mountRegistrationOtp(page: Page, inputCount = 6): Promise<void> {
  const inputs = Array.from(
    { length: inputCount },
    () => '<input type="text" inputmode="numeric" maxlength="1" />',
  ).join('');

  await page.setContent(`
    <section>
      <h1>Xác thực email</h1>
      ${inputs}
      <p role="alert">Mã OTP không hợp lệ</p>
      <p>Mã OTP đã hết hạn</p>
      <button>Xác nhận OTP</button>
      <button>Gửi lại</button>
    </section>
    <script type="text/javascript">
      document.querySelector('button').onclick = () => {
        document.body.dataset.verified = 'true';
      };
      document.querySelector('button:last-of-type').onclick = () => {
        document.body.dataset.resent = 'true';
      };
    </script>
  `);
}

test('exposes only visible registration validation and submit readiness without submitting', async ({
  page,
}) => {
  await page.setContent(`
    <div class="fixed inset-0">
      <button>Đóng</button>
      <button>Đăng nhập với Google</button>
      <button>Đăng ký ngay</button>
      <button>Đăng nhập</button>
      <section hidden>
        <h1>Tạo tài khoản</h1>
        <input placeholder="Họ và tên" />
        <input placeholder="Email của bạn" />
        <input placeholder="Mật khẩu" type="password" />
        <input placeholder="Nhập lại mật khẩu" type="password" />
        <button disabled>Tạo tài khoản</button>
      </section>
    </div>
    <script type="text/javascript">
      const modal = document.querySelector('.fixed');
      const registrationView = modal.querySelector('section');
      const buttons = Array.from(modal.querySelectorAll(':scope > button'));
      buttons.find((button) => button.textContent === 'Đăng ký ngay').onclick = () => {
        registrationView.hidden = false;
      };
      const [fullName, email, password, confirmation] = registrationView.querySelectorAll('input');
      const submitButton = registrationView.querySelector('button');
      const validationMessages = {
        email: 'Vui lòng nhập email hợp lệ',
        password: 'Mật khẩu phải có ít nhất 8 ký tự',
        confirmation: 'Mật khẩu xác nhận không khớp',
      };
      const renderValidation = (key, isVisible) => {
        const selector = '[data-validation="' + key + '"]';
        const mountedMessage = registrationView.querySelector(selector);
        if (!isVisible) {
          mountedMessage?.remove();
          return;
        }
        if (mountedMessage) {
          return;
        }
        const message = document.createElement('p');
        message.dataset.validation = key;
        message.textContent = validationMessages[key];
        submitButton.before(message);
      };
      const updateState = () => {
        const emailValid = /\\S+@\\S+\\.\\S+/.test(email.value);
        const passwordValid = password.value.length >= 8;
        const confirmationMatches = password.value === confirmation.value;
        renderValidation('email', !emailValid);
        renderValidation('password', !passwordValid);
        renderValidation('confirmation', !confirmationMatches);
        submitButton.disabled = !fullName.value.trim() || !emailValid || !passwordValid || !confirmationMatches;
      };
      submitButton.onclick = () => { document.body.dataset.submitted = 'true'; };
      registrationView.querySelectorAll('input').forEach((input) => {
        input.oninput = updateState;
        input.onblur = updateState;
      });
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.open();
  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'tester@example.test',
    password: 'Abcdef1',
    passwordConfirmation: 'different',
  });
  await registerPage.blurAllFields();

  expect(await readValidationPromptly(() => registerPage.visibleValidationMessages())).toEqual([
    'Mật khẩu phải có ít nhất 8 ký tự',
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await registerPage.isSubmitEnabled()).toBe(false);

  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'tester@example.test',
    password: 'Abcdef12',
    passwordConfirmation: 'different',
  });

  expect(await readValidationPromptly(() => registerPage.visibleValidationMessages())).toEqual([
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await readValidationPromptly(() => registerPage.validationMessages())).toEqual([
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await registerPage.isSubmitEnabled()).toBe(false);

  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'tester@example.test',
    password: 'Abcdef12',
    passwordConfirmation: 'Abcdef12',
  });

  expect(await readValidationPromptly(() => registerPage.visibleValidationMessages())).toEqual([]);
  expect(await readValidationPromptly(() => registerPage.validationMessages())).toEqual([]);
  expect(await registerPage.isSubmitEnabled()).toBe(true);
  expect(await page.evaluate(() => document.body.dataset.submitted)).toBeUndefined();
  expect(registerPage).not.toHaveProperty('fillPhone');
});

test(`${registrationOtpEntryContractTestCase.id} ${registrationOtpEntryContractTestCase.title}`, async ({
  page,
}) => {
  await mountRegistrationOtp(page);
  const registerPage = new RegisterPage(page);

  await registerPage.enterOtp(registrationOtpEntryContractTestCase.code ?? '123456');

  expect(
    await page
      .locator('input[type="text"][inputmode="numeric"][maxlength="1"]')
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
  ).toEqual(registrationOtpEntryContractTestCase.expectedValues);

  await registerPage.submitOtp();
  await registerPage.resendOtp();

  expect(await page.evaluate(() => document.body.dataset.verified)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.resent)).toBe('true');
});

test('rejects empty, short, long, or non-numeric OTPs without changing any input', async ({
  page,
}) => {
  await mountRegistrationOtp(page);
  const registerPage = new RegisterPage(page);
  const otpInputs = page.locator('input[type="text"][inputmode="numeric"][maxlength="1"]');

  for (const code of ['', '12345', '1234567', '12345x']) {
    await expect(registerPage.enterOtp(code)).rejects.toThrow('Expected a six-digit OTP.');
    expect(
      await otpInputs.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      ),
    ).toEqual(['', '', '', '', '', '']);
  }
});

test('requires exactly six registration OTP inputs before entering a value', async ({ page }) => {
  await mountRegistrationOtp(page, 5);
  const registerPage = new RegisterPage(page);

  await expect(registerPage.enterOtp('123456')).rejects.toThrow(
    'Expected six OTP inputs, found 5.',
  );
});

test(`${incorrectRegistrationOtpFeedbackTestCase.id} ${incorrectRegistrationOtpFeedbackTestCase.title}`, async ({
  page,
}) => {
  await mountRegistrationOtp(page);

  expect(await new RegisterPage(page).otpError()).toBe('Mã OTP không hợp lệ');
});

test(`${expiredRegistrationOtpFeedbackTestCase.id} ${expiredRegistrationOtpFeedbackTestCase.title}`, async ({
  page,
}) => {
  await mountRegistrationOtp(page);

  expect(await new RegisterPage(page).isOtpExpired()).toBe(true);
});
