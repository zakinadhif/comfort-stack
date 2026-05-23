import { test as base, type Page } from "@playwright/test";

const MOCK_SESSION = {
  session: {
    id: "test-session-id",
    userId: "test-user-id",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ipAddress: null,
    userAgent: null,
  },
  user: {
    id: "test-user-id",
    email: "user@test.com",
    name: "Test User",
    emailVerified: true,
    image: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Intercepts Better Auth's session endpoint and returns a valid mock session.
 * Use with the `authed` fixture to test authenticated routes.
 */
async function mockAuth(page: Page) {
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    }),
  );
}

/**
 * Intercepts Better Auth's session endpoint and returns null (unauthenticated).
 * Use with the `unauthed` fixture to test redirect behaviour.
 */
async function mockNoAuth(page: Page) {
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "null",
    }),
  );
}

/** Fixture: page with a mocked authenticated session. */
export const authed = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await mockAuth(page);
    await use(page);
  },
});

/** Fixture: page with no session (unauthenticated). */
export const unauthed = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await mockNoAuth(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
export { MOCK_SESSION };
