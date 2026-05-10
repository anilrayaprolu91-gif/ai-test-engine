import { test, expect } from '@playwright/test';
import { BrdAppPca01Page } from '../pages/BrdAppPca01Page';
import { analyzeLocator } from '../../lib/healer';

test.describe('BRD-APP-PCA-01: User can update quantity and remove items in cart.', () => {
  test.beforeEach(async ({ page }) => {
    const po = new BrdAppPca01Page(page);
    await po.goto();
    const result = await analyzeLocator({ page, selector: 'body' });
  });

  test('TC-101: User can increase or decrease product quantity.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-APP-PCA-01' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-101' });

    await expect(page).toHaveURL('https://practicesoftwaretesting.com');
    await expect(page).toHaveTitle('Practicesoft Testing');

    const po = new BrdAppPca01Page(page);
    await po.updateQuantity();
    await expect(po.getQuantityLocator()).toHaveText('1');
    await po.updateQuantity();
    await expect(po.getQuantityLocator()).toHaveText('2');
  });

  test('TC-101: Cart totals update after quantity change.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-APP-PCA-01' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-101' });

    await expect(page).toHaveURL('https://practicesoftwaretesting.com');
    await expect(page).toHaveTitle('Practicesoft Testing');

    const po = new BrdAppPca01Page(page);
    await po.updateQuantity();
    await expect(po.getCartTotalLocator()).toHaveText('$10.00');
    await po.updateQuantity();
    await expect(po.getCartTotalLocator()).toHaveText('$20.00');
  });

  test('TC-101: User can remove an item from cart.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-APP-PCA-01' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-101' });

    await expect(page).toHaveURL('https://practicesoftwaretesting.com');
    await expect(page).toHaveTitle('Practicesoft Testing');

    const po = new BrdAppPca01Page(page);
    await po.removeItem();
    await expect(po.getItemLocator()).not.toBeVisible();
  });

  test('TC-101: Removed item no longer appears in cart.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-APP-PCA-01' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-101' });

    await expect(page).toHaveURL('https://practicesoftwaretesting.com');
    await expect(page).toHaveTitle('Practicesoft Testing');

    const po = new BrdAppPca01Page(page);
    await po.removeItem();
    await expect(po.getItemLocator()).not.toBeVisible();
  });
});