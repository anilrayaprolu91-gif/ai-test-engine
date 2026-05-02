import { Page, Locator } from 'playwright';

class BRD01Page {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('https://practicesoftwaretesting.com/');
  }

  get documentationLink() {
    return this.page.getByRole('link', { name: 'Documentation' });
  }

  get testingGuideButton() {
    return this.page.getByRole('button', { name: 'Testing Guide' });
  }

  get bugHuntingButton() {
    return this.page.getByRole('button', { name: '🐛 Bug Hunting' });
  }

  async clickDocumentationLink() {
    await this.documentationLink.click();
  }

  async clickTestingGuideButton() {
    await this.testingGuideButton.click();
  }

  async clickBugHuntingButton() {
    await this.bugHuntingButton.click();
  }
}
