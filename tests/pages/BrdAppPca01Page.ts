import { Page, Locator } from 'playwright';

export class BrdAppPca01Page {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async goto(): Promise<void> {
    await this.page.goto('https://practicesoftwaretesting.com');
  }

  private get cartQuantityInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Quantity' });
  }

  private get removeItemButton(): Locator {
    return this.page.getByRole('button', { name: 'Remove' });
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit' });
  }

  private get cartItemsList(): Locator {
    return this.page.getByRole('listitem');
  }

  public async updateQuantity(quantity: string): Promise<void> {
    await this.cartQuantityInput.fill(quantity);
    await this.submitButton.click();
  }

  public async removeItem(index: number): Promise<void> {
    await this.cartItemsList.nth(index).click();
    await this.removeItemButton.click();
  }
}
