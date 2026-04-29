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

  /**
   * Navigates to the target URL and waits for the network to be idle 
   * to ensure the page is loaded completely.
   */
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Retrieves the current page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }
}

/**
 * Playwright Test Suite
 */
test.describe('Practice Software Testing - Home Page', () => {
  test('Verify page title contains "Practice"', async ({ page }) => {
    const homePage = new HomePage(page);

    // Step 1: Navigate to the target URL
    await homePage.navigate();

    // Step 2: Verify page title contains "Practice"
    const title = await homePage.getPageTitle();
    expect(title).toContain('Practice');
  });
});
