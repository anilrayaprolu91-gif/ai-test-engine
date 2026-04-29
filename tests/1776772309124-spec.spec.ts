import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Home Page
 */
class HomePage {
  readonly page: Page;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly productGrid: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.getByAltText('Practice Software Testing - Toolshop');
    this.searchInput = page.locator('[data-test="search-query"]');
    this.searchButton = page.locator('[data-test="search-submit"]');
    this.productGrid = page.locator('.container .row');
    this.signInLink = page.locator('[data-test="nav-sign-in"]');
  }

  async goto() {
    await this.page.goto('https://practicesoftwaretesting.com/');
  }

  async searchForProduct(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }
}

/**
 * Sanity Test Suite
 */
test.describe('Sanity Test for Practice Software Testing', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should load the homepage correctly', async ({ page }) => {
    // Verify Page Title
    await expect(page).toHaveTitle(/Practice Software Testing/);

    // Verify UI components are visible
    await expect(homePage.logo).toBeVisible();
    await expect(homePage.signInLink).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();
  });

  test('should display products on the main page', async () => {
    // Ensure the product grid is populated
    const firstProduct = homePage.productGrid.locator('.card').first();
    await expect(firstProduct).toBeVisible();
    
    const productCount = await homePage.productGrid.locator('.card').count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should be able to interact with the search bar', async () => {
    const searchTerm = 'Hammer';
    await homePage.searchForProduct(searchTerm);
    
    // Check if the URL contains the search query or if results update
    await expect(homePage.page).toHaveURL(new RegExp(`query=${searchTerm}`));
  });
});
