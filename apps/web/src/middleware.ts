import { auth } from "@/lib/auth";

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  // Allow API auth routes
  if (isApiAuth) return;

  // Allow login page for unauthenticated users
  if (!isLoggedIn && isLoginPage) return;

  // Redirect unauthenticated users to login for protected routes
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
