import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Home/Landing Page
 */
class HomePage {
  readonly page: Page;
  readonly header: Locator;
  readonly navigation: Locator;
  readonly mainContent: Locator;

  constructor(page: Page) {
    this.page = page;
    // Using semantic selectors as no accessibility tree was provided
    this.header = page.locator('nav.navbar'); 
    this.navigation = page.locator('ul.navbar-nav');
    this.mainContent = page.locator('app-root');
  }

  async navigate() {
    await this.page.goto('https://practicesoftwaretesting.com/');
    // Ensure the page is loaded by waiting for network idle or a specific element
    await this.page.waitForLoadState('domcontentloaded');
  }
}

/**
 * TC-001: Application Load
 */
test.describe('Login Flow', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('TC-001: Application Load @smoke', async ({ page }) => {
    // Steps
    await homePage.navigate();

    // Verify page title contains "Practice"
    await expect(page).toHaveTitle(/Practice/);

    // Expected Result: Visible header, navigation, and content
    await expect(homePage.header).toBeVisible();
    await expect(homePage.navigation).toBeVisible();
    await expect(homePage.mainContent).toBeVisible();
  });
});
