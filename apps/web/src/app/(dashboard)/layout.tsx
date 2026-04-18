import { Nav } from "@/components/nav";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="min-h-screen">
      <Nav userName={session?.user?.name} onSignOut={handleSignOut} />
      <main className="container py-6">{children}</main>
    </div>
  );
}
