import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useSession } from "@/lib/auth-client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
