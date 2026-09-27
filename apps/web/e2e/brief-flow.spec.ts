import { expect, test } from "@playwright/test";

test("four-step brief reaches results and keeps purchase fields on edit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /hi, i'm emily/i })).toBeVisible();

  await page.getByPlaceholder(/brand, model/i).fill("visvim FBT");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page).toHaveURL(/\/insider\?/);
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await expect(page.getByLabel(/brand spelling/i)).toHaveValue(/visvim/i);

  await page.getByRole("button", { name: /purchase requirements/i }).click();
  await expect(page).toHaveURL(/\/requirements\?/);
  await expect(page.getByText("Step 3 of 4")).toBeVisible();

  await page.getByLabel(/maximum budget/i).fill("400");
  await page.getByLabel(/shipping to/i).selectOption("us");
  await page.getByLabel(/sizes you'll take/i).fill("UK 9");
  await page.getByRole("button", { name: /find opportunities/i }).click();

  await expect(page).toHaveURL(/\/results\?/);
  await expect(page.getByRole("heading", { name: /opportunities for/i })).toBeVisible();
  await expect(page.getByText(/united states/i).first()).toBeVisible();
  await expect(page.getByText(/budget £400/i)).toBeVisible();
  await expect(page.getByText(/sign in to send this brief/i)).toBeVisible();
  await expect(page.getByText(/sign in above to send this brief/i)).toBeVisible();

  await page.getByRole("link", { name: /edit insider details/i }).click();
  await expect(page).toHaveURL(/dest=us/);
  await expect(page).toHaveURL(/budget=400/);
  await expect(page.getByLabel(/brand spelling/i)).toHaveValue(/visvim/i);

  await page.getByRole("button", { name: /purchase requirements/i }).click();
  await expect(page.getByLabel(/maximum budget/i)).toHaveValue("400");
  await expect(page.getByLabel(/shipping to/i)).toHaveValue("us");
});

test("photo filename becomes the search query when no text is typed", async ({ page }) => {
  await page.goto("/insider?image=kapital-century-boot.jpg");
  await expect(page.getByText(/searching for/i)).toBeVisible();
  await expect(page.getByText(/kapital century boot/i).first()).toBeVisible();
  await expect(page.getByLabel(/anything else/i)).toHaveValue(/kapital-century-boot\.jpg/);
});

test("all-findings page explains the empty state without a brief", async ({ page }) => {
  await page.goto("/results");
  await expect(page.getByText(/start a search and emily will send grok bot/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "All findings" })).toBeVisible();
});

test("operator and reference pages render", async ({ page }) => {
  await page.goto("/references");
  await expect(page.getByRole("heading", { name: /target universe/i })).toBeVisible();

  await page.goto("/bag");
  await expect(page.getByRole("heading", { name: /shopping bag/i })).toBeVisible();

  await page.goto("/invoke");
  await expect(page.getByRole("heading", { name: /sign in to invoke/i })).toBeVisible();

  await page.goto("/desktop");
  await expect(page.getByRole("heading", { name: /operator sign-in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /product search/i })).toBeVisible();
});
