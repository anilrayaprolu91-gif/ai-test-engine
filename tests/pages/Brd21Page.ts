import { Page, Locator } from 'playwright';

export class Brd21Page {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('https://practicesoftwaretesting.com/');
  }

  get searchInput(): Locator {
    return this.page.getByRole('searchbox');
  }

  get searchButton(): Locator {
    return this.page.getByRole('button', { name: 'Search' });
  }

  async searchProduct(keyword: string): Promise<void> {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
  }

  get productResults(): Locator {
    return this.page.getByRole('listitem');
  }

  async getProductResults(): Promise<Locator[]> {
    return this.productResults.all();
  }
}
