import { expect } from "@playwright/test";
import { authed, unauthed } from "./fixtures";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const MOCK_ITEMS = [
  { id: "item-1", name: "First item", createdAt: Date.now() },
  { id: "item-2", name: "Second item", createdAt: Date.now() - 86_400_000 },
];

async function mockItemsApi(page: Parameters<typeof authed>[0]["page"]) {
  await page.route("**/api/items", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ITEMS),
    }),
  );
}

// ---------------------------------------------------------------------------
// Protected routes — unauthenticated users are redirected to /login
// ---------------------------------------------------------------------------

const protectedRoutes = ["/"];

for (const path of protectedRoutes) {
  unauthed(
    `${path} redirects to /login when unauthenticated`,
    async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    },
  );
}

// ---------------------------------------------------------------------------
// Protected routes — authenticated users see expected content
// ---------------------------------------------------------------------------

authed("/ renders home page with items list", async ({ page }) => {
  await mockItemsApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My App" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  await expect(page.getByText("First item")).toBeVisible();
  await expect(page.getByText("Second item")).toBeVisible();
});

authed("/ shows user email in header", async ({ page }) => {
  await mockItemsApi(page);
  await page.goto("/");
  await expect(page.getByText("user@test.com")).toBeVisible();
});

authed("/ shows empty state when no items", async ({ page }) => {
  await page.route("**/api/items", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.goto("/");
  await expect(page.getByText(/no items yet/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

unauthed("unknown route renders 404", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByText("404")).toBeVisible();
});
