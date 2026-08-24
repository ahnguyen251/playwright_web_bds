import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { expect, test, type Page } from '@playwright/test';

import { ProfilePage } from '../../../pages/profile/ProfilePage';

const PROFILE_MARKUP_VALUES = Object.freeze({
  fullName: 'Nguyễn Kiểm Thử',
  email: 'automation@gmail.com',
  phone: '0970000000',
});

interface ProfileMarkupOptions {
  readonly profileInitiallyHidden?: boolean;
}

async function mountProfile(page: Page, options: ProfileMarkupOptions = {}): Promise<void> {
  await page.setContent(`
    <button>Thông tin tài khoản</button>
    <aside>
      <img alt="Avatar" width="72" height="72"
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=" />
    </aside>
    <main>
      <section data-view="profile"${options.profileInitiallyHidden === true ? ' hidden' : ''}>
        <h2>Thông tin tài khoản</h2>
        <img alt="Avatar" width="80" height="80"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=" />
        <input type="file" accept=".jpg,.jpeg,.png,.webp" />
        <span>Active</span>
        <h3>Thông tin cá nhân</h3>
        <label>
          Họ và tên
          <input aria-label="Họ và tên" maxlength="50" value="${PROFILE_MARKUP_VALUES.fullName}" disabled />
        </label>
        <label>
          Email*
          <input aria-label="Email*" value="${PROFILE_MARKUP_VALUES.email}" disabled />
        </label>
        <label>
          Số điện thoại
          <input aria-label="Số điện thoại" value="${PROFILE_MARKUP_VALUES.phone}" disabled />
        </label>
        <button>Chỉnh sửa</button>
        <button hidden>Hủy</button>
        <button hidden>Lưu thay đổi</button>
        <button>Đổi mật khẩu</button>
        <p data-feedback="no-changes" hidden>Không có thay đổi dữ liệu</p>
        <p data-feedback="success" hidden>Cập nhật thông tin thành công</p>
      </section>

      <section data-view="change-password" hidden>
        <h2>Đổi mật khẩu</h2>
        <label>
          Mật khẩu hiện tại*
          <input placeholder="Nhập mật khẩu hiện tại" type="password" />
        </label>
        <label>
          Mật khẩu mới*
          <input placeholder="Nhập mật khẩu mới" type="password" />
        </label>
        <p>Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số</p>
        <label>
          Xác nhận mật khẩu mới*
          <input placeholder="Nhập lại mật khẩu mới" type="password" />
        </label>
        <p data-error="minimum" hidden>Mật khẩu mới phải có ít nhất 8 ký tự.</p>
        <p data-error="complexity" hidden>Mật khẩu phải chứa chữ hoa, chữ thường và chữ số.</p>
        <p data-error="confirmation" hidden>Xác nhận mật khẩu mới không khớp.</p>
        <p data-error="current" hidden>Mật khẩu hiện tại không chính xác</p>
        <button>Hủy</button>
        <button disabled>Cập nhật mật khẩu</button>
      </section>
    </main>
    <script type="text/javascript">
      const accountButton = document.querySelector('body > button');
      const profileView = document.querySelector('[data-view="profile"]');
      const passwordView = document.querySelector('[data-view="change-password"]');
      const fullName = profileView.querySelector('[aria-label="Họ và tên"]');
      const profileAvatar = profileView.querySelector('img[alt="Avatar"]');
      const summaryAvatar = document.querySelector('aside img[alt="Avatar"]');
      const avatarInput = profileView.querySelector('input[type="file"]');
      const email = profileView.querySelector('[aria-label="Email*"]');
      const phone = profileView.querySelector('[aria-label="Số điện thoại"]');
      const edit = Array.from(profileView.querySelectorAll('button')).find(
        (button) => button.textContent === 'Chỉnh sửa',
      );
      const cancelEdit = Array.from(profileView.querySelectorAll('button')).find(
        (button) => button.textContent === 'Hủy',
      );
      const save = Array.from(profileView.querySelectorAll('button')).find(
        (button) => button.textContent === 'Lưu thay đổi',
      );
      const openPassword = Array.from(profileView.querySelectorAll('button')).find(
        (button) => button.textContent === 'Đổi mật khẩu',
      );
      const originalFullName = fullName.value;
      const noChanges = profileView.querySelector('[data-feedback="no-changes"]');
      const success = profileView.querySelector('[data-feedback="success"]');
      let avatarChanged = false;

      accountButton.onclick = () => {
        document.body.dataset.accountInformationOpened = 'true';
        profileView.hidden = false;
      };
      edit.onclick = () => {
        fullName.disabled = false;
        edit.hidden = true;
        openPassword.hidden = true;
        cancelEdit.hidden = false;
        save.hidden = false;
        save.disabled = false;
      };
      avatarInput.onchange = () => {
        const file = avatarInput.files[0];
        if (file) {
          profileAvatar.src = URL.createObjectURL(file);
          avatarChanged = true;
        }
      };
      cancelEdit.onclick = () => {
        fullName.value = originalFullName;
        fullName.disabled = true;
        edit.hidden = false;
        openPassword.hidden = false;
        cancelEdit.hidden = true;
        save.hidden = true;
        noChanges.hidden = true;
        success.hidden = true;
      };
      save.onclick = () => {
        if (fullName.value === originalFullName && !avatarChanged) {
          noChanges.hidden = false;
          return;
        }
        fullName.disabled = true;
        edit.hidden = false;
        openPassword.hidden = false;
        cancelEdit.hidden = true;
        save.hidden = true;
        summaryAvatar.src = profileAvatar.src;
        success.hidden = false;
        document.body.dataset.profileSaved = 'true';
      };
      openPassword.onclick = () => {
        profileView.hidden = true;
        passwordView.hidden = false;
      };

      const currentPassword = passwordView.querySelector(
        '[placeholder="Nhập mật khẩu hiện tại"]',
      );
      const newPassword = passwordView.querySelector('[placeholder="Nhập mật khẩu mới"]');
      const passwordConfirmation = passwordView.querySelector(
        '[placeholder="Nhập lại mật khẩu mới"]',
      );
      const minimumError = passwordView.querySelector('[data-error="minimum"]');
      const complexityError = passwordView.querySelector('[data-error="complexity"]');
      const confirmationError = passwordView.querySelector('[data-error="confirmation"]');
      const currentPasswordError = passwordView.querySelector('[data-error="current"]');
      const submitPassword = Array.from(passwordView.querySelectorAll('button')).find(
        (button) => button.textContent === 'Cập nhật mật khẩu',
      );
      const cancelPassword = Array.from(passwordView.querySelectorAll('button')).find(
        (button) => button.textContent === 'Hủy',
      );

      const validatePassword = () => {
        const isLongEnough = newPassword.value.length >= 8;
        const hasRequiredCharacters =
          /[A-Z]/.test(newPassword.value) &&
          /[a-z]/.test(newPassword.value) &&
          /[0-9]/.test(newPassword.value);
        const matchesConfirmation = newPassword.value === passwordConfirmation.value;

        minimumError.hidden = isLongEnough;
        complexityError.hidden = !isLongEnough || hasRequiredCharacters;
        confirmationError.hidden = !isLongEnough || !hasRequiredCharacters || matchesConfirmation;
        submitPassword.disabled =
          currentPassword.value.length === 0 ||
          !isLongEnough ||
          !hasRequiredCharacters ||
          !matchesConfirmation;
      };
      currentPassword.oninput = validatePassword;
      newPassword.oninput = validatePassword;
      passwordConfirmation.oninput = validatePassword;
      cancelPassword.onclick = () => {
        passwordView.hidden = true;
        profileView.hidden = false;
      };
      submitPassword.onclick = () => {
        if (currentPassword.value === 'WrongCurrent1') {
          currentPasswordError.hidden = false;
          return;
        }
        document.body.dataset.passwordSubmitted = 'true';
      };

      // Preserve the deployed invariant: email and verified phone never become editable.
      email.disabled = true;
      phone.disabled = true;
    </script>
  `);
}

async function createProfilePage(
  page: Page,
  options: ProfileMarkupOptions = {},
): Promise<ProfilePage> {
  await mountProfile(page, options);
  return new ProfilePage(page);
}

test('opens account information before reading disabled profile fields', async ({ page }) => {
  const profilePage = await createProfilePage(page, { profileInitiallyHidden: true });

  await profilePage.openAccountInformation();
  expect(await page.evaluate(() => document.body.dataset.accountInformationOpened)).toBe('true');

  const profile = await profilePage.profile().read();
  expect(profile).toEqual({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'automation@gmail.com',
    phone: '0970000000',
  });
  expect(await profilePage.profile().isEmailDisabled()).toBe(true);
  expect(await profilePage.profile().isPhoneDisabled()).toBe(true);
});

test('enables only the full name and restores it when editing is cancelled', async ({ page }) => {
  const profilePage = await createProfilePage(page);
  const profile = profilePage.profile();

  await profile.startEditing();

  expect(await profile.isSaveEnabled()).toBe(true);
  expect(await profile.isEmailDisabled()).toBe(true);
  expect(await profile.isPhoneDisabled()).toBe(true);

  await profile.updateFullName('Nguyễn Đã Sửa');

  expect((await profile.read()).fullName).toBe('Nguyễn Đã Sửa');
  expect(await profile.isSaveEnabled()).toBe(true);

  await profile.cancel();

  expect(await profile.read()).toEqual({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'automation@gmail.com',
    phone: '0970000000',
  });
});

test('saves an allowed full-name update through the profile component', async ({ page }) => {
  const profile = (await createProfilePage(page)).profile();

  await profile.startEditing();
  await profile.updateFullName('Nguyễn Đã Lưu');
  await profile.save();

  expect((await profile.read()).fullName).toBe('Nguyễn Đã Lưu');
  expect(await page.evaluate(() => document.body.dataset.profileSaved)).toBe('true');
});

test('exposes password minimum, complexity, and confirmation validation without submitting', async ({
  page,
}) => {
  const profilePage = await createProfilePage(page);
  const changePassword = profilePage.changePassword();

  await changePassword.open();
  expect(await changePassword.isSubmitEnabled()).toBe(false);

  await changePassword.fill({
    currentPassword: 'CurrentPassword1',
    newPassword: 'short',
    passwordConfirmation: 'different',
  });
  expect(await changePassword.validationMessages()).toEqual([
    'Mật khẩu mới phải có ít nhất 8 ký tự.',
  ]);

  await changePassword.fill({
    currentPassword: 'CurrentPassword1',
    newPassword: 'lowercase1',
    passwordConfirmation: 'lowercase1',
  });
  expect(await changePassword.validationMessages()).toEqual([
    'Mật khẩu phải chứa chữ hoa, chữ thường và chữ số.',
  ]);

  await changePassword.fill({
    currentPassword: 'CurrentPassword1',
    newPassword: 'ValidPass1',
    passwordConfirmation: 'Different1',
  });
  expect(await changePassword.validationMessages()).toEqual(['Xác nhận mật khẩu mới không khớp.']);
  expect(await changePassword.isSubmitEnabled()).toBe(false);

  await changePassword.fill({
    currentPassword: 'CurrentPassword1',
    newPassword: 'ValidPass1',
    passwordConfirmation: 'ValidPass1',
  });
  expect(await changePassword.validationMessages()).toEqual([]);
  expect(await changePassword.isSubmitEnabled()).toBe(true);
});

test('cancels change-password editing and returns to the profile view', async ({ page }) => {
  const profilePage = await createProfilePage(page);
  const changePassword = profilePage.changePassword();

  await changePassword.open();
  await changePassword.cancel();

  expect(await profilePage.profile().read()).toEqual({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'automation@gmail.com',
    phone: '0970000000',
  });
});

test('submits valid change-password data through the explicit operation', async ({ page }) => {
  const changePassword = (await createProfilePage(page)).changePassword();

  await changePassword.open();
  await changePassword.fill({
    currentPassword: 'CurrentPassword1',
    newPassword: 'ValidPass1',
    passwordConfirmation: 'ValidPass1',
  });
  await changePassword.submit();

  expect(await page.evaluate(() => document.body.dataset.passwordSubmitted)).toBe('true');
});

test('exposes the account avatar and Active status required by the profile view contract', async ({
  page,
}) => {
  const profile = (await createProfilePage(page)).profile();

  expect(await profile.hasAvatar()).toBe(true);
  expect(await profile.isActiveBadgeVisible()).toBe(true);
});

test('exposes and enforces the confirmed 50-character full-name boundary', async ({ page }) => {
  const profile = (await createProfilePage(page)).profile();
  const overlongName = 'A'.repeat(60);

  await profile.startEditing();
  await profile.pasteFullName(overlongName);

  expect(await profile.fullNameMaximumLength()).toBe(50);
  expect((await profile.read()).fullName).toBe(overlongName.slice(0, 50));
});

test('reports no changes and does not mark the profile saved when unchanged data is submitted', async ({
  page,
}) => {
  const profile = (await createProfilePage(page)).profile();

  await profile.startEditing();
  await profile.save();

  expect(await profile.noChangesMessage()).toBe('Không có thay đổi dữ liệu');
  expect(await page.evaluate(() => document.body.dataset.profileSaved)).toBeUndefined();
});

test('uploads an avatar and synchronizes the profile summary after saving', async ({ page }) => {
  const profilePage = await createProfilePage(page);
  const profile = profilePage.profile();
  const avatar = {
    name: 'avatar_valid.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
      'base64',
    ),
  };

  await profile.startEditing();
  await profile.updateFullName('Nguyễn Có Avatar');
  await profile.uploadAvatar(avatar);
  await profile.save();

  expect(await profilePage.hasSynchronizedAvatar()).toBe(true);
  expect(await profile.successMessage()).toBe('Cập nhật thông tin thành công');
});

test('captures the exact current avatar bytes for cleanup instead of a rendered screenshot', async ({
  page,
}) => {
  const profile = (await createProfilePage(page)).profile();
  const expectedAvatar = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
    'base64',
  );

  const baseline = await profile.captureAvatarBaseline();

  expect(baseline.name).toBe('profile-avatar-baseline.png');
  expect(baseline.mimeType).toBe('image/png');
  expect(baseline.buffer).toEqual(expectedAvatar);
});

test('rejects a successful HTTP avatar response when the payload is not an image', async ({
  page,
}) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<html><body>Login required</body></html>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  try {
    const address = server.address() as AddressInfo;
    const avatarUrl = `http://127.0.0.1:${String(address.port)}/avatar.png`;
    const profile = (await createProfilePage(page)).profile();
    await page.evaluate((source) => {
      const avatar = document.querySelector('main img[alt="Avatar"]');
      if (!(avatar instanceof HTMLImageElement)) throw new Error('Profile avatar is missing.');
      avatar.src = source;
    }, avatarUrl);

    await expect(profile.captureAvatarBaseline()).rejects.toThrow(
      'Current Profile avatar response is not an image.',
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('exposes a wrong-current-password error while preserving entered values', async ({ page }) => {
  const changePassword = (await createProfilePage(page)).changePassword();
  const data = {
    currentPassword: 'WrongCurrent1',
    newPassword: 'ValidPassword1',
    passwordConfirmation: 'ValidPassword1',
  };

  await changePassword.open();
  await changePassword.fill(data);
  await changePassword.submit();

  expect(await changePassword.currentPasswordError()).toBe('Mật khẩu hiện tại không chính xác');
  expect(await changePassword.matches(data)).toBe(true);
});
