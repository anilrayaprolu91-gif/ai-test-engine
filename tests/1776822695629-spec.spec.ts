import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Practice Software Testing Home Page
 */
class HomePage {
  readonly page: Page;
  readonly url = 'https://practicesoftwaretesting.com/';
  readonly logo: Locator;
  readonly navMenu: Locator;
  readonly productGrid: Locator;

  constructor(page: Page) {
    this.page = page;
    // Common locators for this specific target site
    this.logo = page.getByRole('img', { name: 'Practice Software Testing - Toolshop' });
    this.navMenu = page.getByRole('navigation');
    this.productGrid = page.locator('.col-md-9'); // Main product display area
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async verifyPageLoaded() {
    await expect(this.logo).toBeVisible();
    await expect(this.navMenu).toBeVisible();
    await expect(this.productGrid).toBeVisible();
  }
}

/**
 * Test Suite
 */
test.describe('Basic Functionality Tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('Test Basic test - verify homepage loads successfully', async () => {
    // 1. Navigate to the target URL
    await homePage.goto();

    // 2. Verify basic structural elements are present
    await homePage.verifyPageLoaded();

    // 3. Verify the title
    await expect(homePage.page).toHaveTitle(/Practice Software Testing - Toolshop/);
  });
});
