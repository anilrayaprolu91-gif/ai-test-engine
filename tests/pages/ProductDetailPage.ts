import { Page, Locator } from 'playwright';

export class ProductDetailPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('https://practicesoftwaretesting.com');
  }

  get productName(): Locator {
    return this.page.getByRole('heading', { name: 'Product Name' });
  }

  get productDescription(): Locator {
    return this.page.getByRole('heading', { name: 'Product Description' });
  }

  get productPrice(): Locator {
    return this.page.getByRole('heading', { name: 'Product Price' });
  }

  get addToCartButton(): Locator {
    return this.page.getByRole('button', { name: 'Add to Cart' });
  }

  async viewProductInfo(): Promise<void> {
    await this.productName.waitFor();
    await this.productDescription.waitFor();
    await this.productPrice.waitFor();
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }
}
