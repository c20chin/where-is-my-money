import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold">
            WIMM
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/accounts" className="text-muted-foreground hover:text-foreground">
              Accounts
            </Link>
            <Link href="/snapshots" className="text-muted-foreground hover:text-foreground">
              Snapshots
            </Link>
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              Settings
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.name && (
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
