import { expect, test } from '@playwright/test';

async function fillNewRequirementForm(page: import('@playwright/test').Page, values: {
  brdId: string;
  targetUrl: string;
  testGoal: string;
}) {
  await page.getByPlaceholder('e.g. BRD-04').fill(values.brdId);
  await page.getByPlaceholder('https://example.com').fill(values.targetUrl);
  await page.getByPlaceholder('Describe the requirement, expected behaviour, and business intent.').fill(values.testGoal);
}

function getMainTable(page: import('@playwright/test').Page) {
  return page.locator('section', {
    has: page.getByRole('heading', { name: 'Test Cases' }),
  });
}

async function getFirstVisibleBrdId(page: import('@playwright/test').Page) {
  const mainTable = getMainTable(page);
  const firstRow = mainTable.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();
  const firstCellText = (await firstRow.locator('td').first().textContent())?.trim() || '';
  return firstCellText;
}

test.describe('Dashboard smoke checks', () => {
  test('renders release health and sync matrix @smoke', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'AI-Native Quality Controller' })).toBeVisible();
    await expect(page.getByText('Total BRDs')).toBeVisible();
    await expect(page.getByText('Failing BRDs')).toBeVisible();
    await expect(page.getByText('Passing BRDs')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'BRD-01' })).toBeVisible();
  });

  test('supports search, status filter, and csv export @smoke', async ({ page }) => {
    await page.goto('/');

    const visibleBrdId = await getFirstVisibleBrdId(page);
    expect(visibleBrdId).toMatch(/^BRD-/);

    const search = page.getByPlaceholder('Search BRD, requirement, or test case');
    await search.fill(visibleBrdId);
    await expect(page.getByRole('cell', { name: visibleBrdId }).first()).toBeVisible();

    await search.fill('__unlikely_brd_value__');
    await expect(page.getByText('No BRDs match the current search and status filters.')).toBeVisible();

    await search.fill('');
    const statusFilter = page.getByRole('combobox', { name: '' }).first();
    await statusFilter.selectOption('passing');
    await expect(page.getByText(/Showing \d+ of \d+ BRDs\./)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('opens and closes test cases popup from count button @smoke', async ({ page }) => {
    await page.goto('/');

    const mainTable = getMainTable(page);
    const testCasesButton = mainTable.getByRole('button', { name: /\d+ Test Case(s)?/ }).first();
    await expect(testCasesButton).toBeVisible();

    await testCasesButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Test Case Descriptions/)).toBeVisible();
    await expect(dialog.getByRole('columnheader', { name: 'TC_ID' })).toBeVisible();
    await expect(dialog.getByRole('columnheader', { name: 'Description' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('toggles theme from dark mode button @smoke', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.getByRole('button', { name: 'Dark mode' });
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.getByRole('button', { name: 'Light mode' })).toBeVisible();
  });

  test('local mode plan-only generation downloads file and shows command @smoke', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Local mode: files are downloaded.')).toBeVisible();
    await fillNewRequirementForm(page, {
      brdId: 'BRD-11',
      targetUrl: 'https://example.com/checkout',
      testGoal: 'Verify checkout confirmation can be planned from local dashboard flow.',
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Plan Only' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^\d+-spec\.md$/);

    await expect(page.getByText(/Move to test-plans\//)).toBeVisible();
    await expect(page.getByText(/create-test-plan\.js/)).toBeVisible();
  });

  test('local mode plan-and-tests generation downloads spec and shows convert command @smoke', async ({ page }) => {
    await page.goto('/');

    await fillNewRequirementForm(page, {
      brdId: 'BRD-12',
      targetUrl: 'https://example.com/orders',
      testGoal: 'Create spec and tests generation command for order confirmation path.',
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Plan + Tests' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^\d+-spec\.md$/);

    await expect(page.getByText(/Move to specs\//)).toBeVisible();
    await expect(page.getByText(/node scripts\/convertSpec\.js/)).toBeVisible();
    await expect(page.getByText(/--brd=BRD-12/)).toBeVisible();
  });

  test('local mode generate-tests-only flow validates selection and click status @smoke', async ({ page }) => {
    await page.goto('/');

    const emptyState = page.getByText('All BRDs already have generated Playwright tests, or no BRDs are loaded yet.');
    const zeroSelectedButton = page.getByRole('button', { name: /Generate Tests \(0 selected\)/ });

    if (await emptyState.count()) {
      await expect(emptyState).toBeVisible();
      await expect(zeroSelectedButton).toHaveCount(0);
      return;
    }

    await expect(zeroSelectedButton).toBeDisabled();

    const selectableBrdButton = page.locator('section', {
      has: page.getByRole('heading', { name: 'Generate Tests for Existing Plans' }),
    }).locator('button').filter({ hasText: /^BRD-/ }).first();

    await selectableBrdButton.click();

    const generateOneSelected = page.getByRole('button', { name: 'Generate Tests (1 selected)' });
    await expect(generateOneSelected).toBeEnabled();
    await generateOneSelected.click();

    await expect(page.getByText(/Local mode: run\s+node scripts\/generate-local-tests\.js --all/)).toBeVisible();
  });
});
