import { ROUTES } from '../../constants/routes';
import { expect, test } from '../../fixtures/test.fixture';
import { chatCaseTitle } from '../../test-cases/chat/chat.test-cases';

test.describe('Chat Guest Read-Only Scenarios', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(
    chatCaseTitle('TC-CHAT-CREATE-002'),
    async ({ listingDetailPage, page }) => {
      // 1. Visit listing detail page as unauthenticated guest
      await listingDetailPage.open(48);
      await expect(listingDetailPage.hostChatButton).toBeVisible();

      // 2. Click "Nhắn tin chủ nhà" button
      await listingDetailPage.openChatWithHost();

      // 3. Verify chat window is blocked and login modal is displayed
      expect(await listingDetailPage.chatWindow.isOpen()).toBe(false);
      await expect(listingDetailPage.loginModalHeading).toBeVisible();
      await expect(listingDetailPage.loginModalEmailInput).toBeVisible();
      await expect(listingDetailPage.loginModalPasswordInput).toBeVisible();

      // 4. Navigate directly to /chat route
      await page.goto(ROUTES.chat);
      await expect(page).toHaveURL(/\/login\?redirect=(%2Fchat|\/chat)/);
    },
  );
});
