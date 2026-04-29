import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Home Page
 */
class HomePage {
  readonly page: Page;
  readonly url = 'https://practicesoftwaretesting.com/';
  readonly brandLogo: Locator;
  readonly navHome: Locator;
  readonly navContact: Locator;
  readonly navSignIn: Locator;
  readonly productGrid: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    // Selectors based on common patterns for the practice site
    this.brandLogo = page.getByRole('link', { name: 'Practice Software Testing - Toolshop' });
    this.navHome = page.getByTestId('nav-home');
    this.navContact = page.getByTestId('nav-contact');
    this.navSignIn = page.getByTestId('nav-sign-in');
    this.productGrid = page.locator('.col-md-9'); // Main product display area
    this.footer = page.locator('footer');
  }

  async goto() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }

  async verifySanityElements() {
    await expect(this.brandLogo).toBeVisible();
    await expect(this.navHome).toBeVisible();
    await expect(this.navContact).toBeVisible();
    await expect(this.navSignIn).toBeVisible();
    await expect(this.productGrid).toBeVisible();
    await expect(this.footer).toBeVisible();
  }
}

/**
 * Playwright Test Suite
 */
test.describe('Sanity Checks', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should verify the homepage loads with all core components', async () => {
    // Assert page title
    await expect(homePage.page).toHaveTitle(/Practice Software Testing - Toolshop/);
    
    // Assert presence of key UI elements via POM
    await homePage.verifySanityElements();
  });

  test('should confirm navigation menu is functional', async ({ page }) => {
    await homePage.navContact.click();
    await expect(page).toHaveURL(/.*contact/);
    
    await homePage.navHome.click();
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/');
  });

  test('should display product list', async () => {
    // Ensure at least one product card is rendered
    const productCards = homePage.page.locator('.card');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
