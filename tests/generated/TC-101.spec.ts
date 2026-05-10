import { test, expect } from '@playwright/test';
import { Brd21Page } from '../pages/Brd21Page';
import { analyzeLocator } from '../../lib/healer';

test.describe('BRD-21: User can search products by keyword.', () => {
  test.beforeEach(async ({ page }) => {
    const po = new Brd21Page(page);
    await po.goto();
    const result = await analyzeLocator({ page, selector: 'text=Search' });
  });

  test('TC-101: Search input accepts keyword text.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-21' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-101' });

    const po = new Brd21Page(page);
    await po.searchInput.sendKeys('test');
    await expect(po.searchInput).toHaveValue('test');
  });

  test('TC-102: Result list updates after search.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-21' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-102' });

    const po = new Brd21Page(page);
    await po.searchInput.sendKeys('test');
    await po.searchButton.click();
    await expect(po.resultList).toBeVisible();
  });

  test('TC-103: Matching products are displayed.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-21' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-103' });

    const po = new Brd21Page(page);
    await po.searchInput.sendKeys('test');
    await po.searchButton.click();
    await expect(po.resultList).toHaveText('Test Product');
  });

  test('TC-104: Clearing the search restores broader results.', async ({ page }) => {
    test.info().annotations.push({ type: 'BRD_ID', description: 'BRD-21' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: 'TC-104' });

    const po = new Brd21Page(page);
    await po.searchInput.clear();
    await expect(po.resultList).not.toBeVisible();
  });
});