import { useListItems } from "@myapp/api-client-react";
import { useLocation } from "wouter";
import { signOut, useSession } from "@/lib/auth-client";

export default function Home() {
  const { data: session } = useSession();
  const [, navigate] = useLocation();
  const { data: items, isLoading } = useListItems();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My App</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {session?.user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            Sign out
          </button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-medium text-foreground">Items</h2>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items && items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No items yet. Create one via the API.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
