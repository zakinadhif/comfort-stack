import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	// In the bundled deploy the SPA and API share an origin, so the current
	// origin is correct. VITE_APP_URL overrides it at build time if needed.
	baseURL:
		import.meta.env.VITE_APP_URL ||
		(typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:5173"),
});

export const { useSession, signIn, signUp, signOut } = authClient;
