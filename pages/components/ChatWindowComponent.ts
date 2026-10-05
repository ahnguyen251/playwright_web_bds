import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

export class ChatWindowComponent extends BasePage {
  public readonly windowRoot: Locator;
  public readonly header: Locator;
  public readonly title: Locator;
  public readonly closeButton: Locator;
  public readonly minimizeButton: Locator;
  public readonly backButton: Locator;
  public readonly messageTextarea: Locator;
  public readonly sendButton: Locator;
  public readonly messageBubbles: Locator;

  public constructor(page: Page) {
    super(page);
    this.windowRoot = page.locator('.chat-window-root').first();
    this.header = this.windowRoot.locator('.ch-header').first();
    this.title = this.windowRoot.locator('.ch-title, .ch-left span').first();
    this.closeButton = this.windowRoot.locator('button.ch-close-btn, button[title="Đóng"]').first();
    this.minimizeButton = this.windowRoot.locator('button[title="Thu nhỏ"]').first();
    this.backButton = this.windowRoot.locator('button[title="Quay lại"]').first();
    this.messageTextarea = this.windowRoot.locator('textarea.ci-input').first();
    this.sendButton = this.windowRoot.locator('button.ci-send-btn').first();
    this.messageBubbles = this.windowRoot.locator('.cm-bubble, .cm-text, [class*="bubble"]');
  }

  public async isOpen(): Promise<boolean> {
    return (await this.windowRoot.count()) > 0 && (await this.windowRoot.isVisible());
  }

  public async getHeaderTitle(): Promise<string> {
    return (await this.title.innerText()).trim();
  }

  public async isSendButtonDisabled(): Promise<boolean> {
    return this.sendButton.isDisabled();
  }

  public async fillMessage(content: string): Promise<void> {
    await this.messageTextarea.fill(content);
  }

  public async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  public async sendMessage(content: string): Promise<void> {
    await this.fillMessage(content);
    await this.clickSend();
  }

  public async getMessageCount(): Promise<number> {
    return this.messageBubbles.count();
  }

  public async getLastMessageText(): Promise<string> {
    const count = await this.messageBubbles.count();
    if (count === 0) return '';
    return (await this.messageBubbles.nth(count - 1).innerText()).trim();
  }

  public async close(): Promise<void> {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    }
  }
}
