import { test, expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Home Page
 */
class HomePage {
  readonly page: Page;
  readonly url = 'https://practicesoftwaretesting.com/';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto(this.url);
    // Ensuring the page is completely loaded as per requirements
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Playwright Test Suite
 */
test.describe('Practice Software Testing - Home Page', () => {
  test('Navigate and verify page title', async ({ page }) => {
    const homePage = new HomePage(page);

    // Navigate to the target URL
    await homePage.navigate();

    // Verify page title contains "Practice"
    await expect(page).toHaveTitle(/Practice/);
  });
});
