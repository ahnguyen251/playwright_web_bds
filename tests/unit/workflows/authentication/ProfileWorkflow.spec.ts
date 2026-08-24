import { expect, test } from '@playwright/test';

import type { AvatarFilePayload } from '../../../../pages/components/ProfileFormComponent';
import { ProfileWorkflow } from '../../../../workflows/authentication/ProfileWorkflow';
import type { PasswordChangeData } from '../../../../types/user.types';

interface ProfileHarness {
  readonly calls: string[];
  readonly workflow: ProfileWorkflow;
}

const createProfileHarness = (currentFullName: string): ProfileHarness => {
  const calls: string[] = [];
  const profileForm = {
    read: () =>
      Promise.resolve({
        fullName: currentFullName,
        email: 'automation@example.test',
        phone: '0970000000',
      }),
    startEditing: () => {
      calls.push('start editing');
      return Promise.resolve();
    },
    updateFullName: (fullName: string) => {
      calls.push(`update full name ${fullName}`);
      return Promise.resolve();
    },
    uploadAvatar: (avatar: string | AvatarFilePayload) => {
      calls.push(`upload avatar ${typeof avatar === 'string' ? avatar : avatar.name}`);
      return Promise.resolve();
    },
    captureAvatarBaseline: () =>
      Promise.resolve({
        name: 'profile-avatar-baseline.png',
        mimeType: 'image/png',
        buffer: Buffer.from('baseline'),
      }),
    save: () => {
      calls.push('save');
      return Promise.resolve();
    },
  };
  const passwordForm = {
    open: () => Promise.resolve(),
    fill: () => Promise.resolve(),
    submit: () => Promise.resolve(),
  };
  const profilePage = {
    open: () => {
      calls.push('open profile');
      return Promise.resolve();
    },
    openAccountInformation: () => {
      calls.push('open account information');
      return Promise.resolve();
    },
    profile: () => profileForm,
    changePassword: () => passwordForm,
  };

  return { calls, workflow: new ProfileWorkflow(profilePage) };
};

test('does not enter edit mode or save when the full name is unchanged', async () => {
  const harness = createProfileHarness('Propify Automation');

  await harness.workflow.updateFullName('Propify Automation');

  expect(harness.calls).toEqual(['open profile', 'open account information']);
  expect(harness.calls).not.toContain('save');
});

test('updates a changed full name and saves exactly once', async () => {
  const harness = createProfileHarness('Original Name');

  await harness.workflow.updateFullName('Nguyá»…n Kiá»ƒm Thá»­');

  expect(harness.calls).toEqual([
    'open profile',
    'open account information',
    'start editing',
    'update full name Nguyá»…n Kiá»ƒm Thá»­',
    'save',
  ]);
  expect(harness.calls.filter((call) => call === 'save')).toHaveLength(1);
});

test('delegates password-change data without reading environment state', async () => {
  const calls: string[] = [];
  let delegatedData: PasswordChangeData | undefined;
  const data: PasswordChangeData = {
    currentPassword: 'Current!123',
    newPassword: 'NewStrong!123',
    passwordConfirmation: 'NewStrong!123',
  };
  const passwordForm = {
    open: () => {
      calls.push('open password form');
      return Promise.resolve();
    },
    fill: (actualData: PasswordChangeData) => {
      delegatedData = actualData;
      calls.push('fill password form');
      return Promise.resolve();
    },
    submit: () => {
      calls.push('submit password form');
      return Promise.resolve();
    },
  };
  const profilePage = {
    open: () => {
      calls.push('open profile');
      return Promise.resolve();
    },
    openAccountInformation: () => Promise.resolve(),
    profile: () => ({
      read: () => Promise.resolve({ fullName: '', email: '', phone: '' }),
      startEditing: () => Promise.resolve(),
      updateFullName: () => Promise.resolve(),
      uploadAvatar: () => Promise.resolve(),
      captureAvatarBaseline: () =>
        Promise.resolve({
          name: 'profile-avatar-baseline.png',
          mimeType: 'image/png',
          buffer: Buffer.from('baseline'),
        }),
      save: () => Promise.resolve(),
    }),
    changePassword: () => passwordForm,
  };

  await new ProfileWorkflow(profilePage).changePassword(data);

  expect(delegatedData).toEqual(data);
  expect(calls).toEqual([
    'open profile',
    'open password form',
    'fill password form',
    'submit password form',
  ]);
});

test('updates a changed full name and avatar in one saved profile operation', async () => {
  const harness = createProfileHarness('Original Name');

  await harness.workflow.updateProfile({
    fullName: 'Updated Name',
    avatar: 'test-data/files/listing-images/property.png',
  });

  expect(harness.calls).toEqual([
    'open profile',
    'open account information',
    'start editing',
    'update full name Updated Name',
    'upload avatar test-data/files/listing-images/property.png',
    'save',
  ]);
});

test('saves an avatar-only update even when the full name is unchanged', async () => {
  const harness = createProfileHarness('Baseline Name');

  await harness.workflow.updateProfile({
    fullName: 'Baseline Name',
    avatar: 'avatar_valid.png',
  });

  expect(harness.calls).toEqual([
    'open profile',
    'open account information',
    'start editing',
    'upload avatar avatar_valid.png',
    'save',
  ]);
});

test('captures an avatar cleanup baseline after opening account information', async () => {
  const harness = createProfileHarness('Baseline Name');

  const baseline = await harness.workflow.captureAvatarBaseline();

  expect(baseline.name).toBe('profile-avatar-baseline.png');
  expect(harness.calls).toEqual(['open profile', 'open account information']);
});
