import { Page, Locator } from 'playwright';

export class BrdAppPca01Page {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async goto(): Promise<void> {
    await this.page.goto('https://practicesoftwaretesting.com');
  }

  public get cartItems(): Locator {
    return this.page.getByRole('listitem');
  }

  public get cartQuantityInput(): Locator {
    return this.page.getByRole('spinbutton');
  }

  public get removeItemButton(): Locator {
    return this.page.getByRole('button', { name: 'Remove' });
  }

  public async updateQuantity(quantity: number): Promise<void> {
    await this.cartQuantityInput.fill(String(quantity));
  }

  public async removeItem(): Promise<void> {
    await this.removeItemButton.click();
  }
}
