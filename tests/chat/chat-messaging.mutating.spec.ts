import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { chatCaseTitle } from '../../test-cases/chat/chat.test-cases';

test.describe('Chat Messaging Mutating Scenarios', () => {
  test.use({ storageState: '.auth/defaultUser.json' });

  test(chatCaseTitle('TC-CHAT-CREATE-001'),
    async ({ listingDetailPage }) => {
      // 1. Visit listing detail page as authenticated user
      await listingDetailPage.open(48);
      await expect(listingDetailPage.hostChatButton).toBeVisible();

      // 2. Click "Nhắn tin chủ nhà" button to initialize / enter conversation
      await listingDetailPage.openChatWithHost();

      // 3. Verify chat window opens and shows message input
      await expect(listingDetailPage.chatWindow.windowRoot).toBeVisible();
      await expect(listingDetailPage.chatWindow.messageTextarea).toBeVisible();

      // 4. Verify send button is initially disabled when input is empty
      await expect(listingDetailPage.chatWindow.sendButton).toBeDisabled();

      // 5. Fill valid message content
      const messageContent = `Xin chào, tôi quan tâm đến tin đăng này ${String(Date.now())}`;
      await listingDetailPage.chatWindow.fillMessage(messageContent);

      // 6. Verify send button becomes enabled
      await expect(listingDetailPage.chatWindow.sendButton).toBeEnabled();

      // 7. Click send button
      await listingDetailPage.chatWindow.clickSend();

      // 8. Verify message bubble is rendered in conversation and textarea resets
      await expect(
        listingDetailPage.chatWindow.messageBubbles.filter({ hasText: messageContent }),
      ).toBeVisible();
      await expect(listingDetailPage.chatWindow.messageTextarea).toHaveValue('');
    },
  );
});
