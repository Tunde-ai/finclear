import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding"]);
const isClientRoute = createRouteMatcher(["/dashboard/client(.*)"]);
const isAccountantRoute = createRouteMatcher(["/dashboard/accountant(.*)"]);
const isDashboardRoot = createRouteMatcher(["/dashboard"]);
const isSharedDashboardRoute = createRouteMatcher(["/dashboard/jamaica-house(.*)"]);


export default clerkMiddleware(async (auth, req) => {
  // 1. Unauthenticated + protected route → sign in
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();
  const url = req.nextUrl.clone();

  // Get role from session claims first (fast path)
  const { sessionClaims } = await auth();
  let role = sessionClaims?.metadata?.role as
    | "CLIENT"
    | "ACCOUNTANT"
    | undefined;

  // If no role in session claims but user is authenticated,
  // check publicMetadata directly (handles stale JWT after set-role)
  if (!role && userId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      role = user.publicMetadata?.role as "CLIENT" | "ACCOUNTANT" | undefined;
    } catch {
      // If Clerk API fails, fall through with no role
    }
  }

  // 2. No role + not on /onboarding → redirect to onboarding
  if (!role && isProtectedRoute(req) && !isOnboardingRoute(req)) {
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // 3. Has role + on /onboarding → redirect to role dashboard
  if (role && isOnboardingRoute(req)) {
    url.pathname =
      role === "ACCOUNTANT" ? "/dashboard/accountant" : "/dashboard/client";
    return NextResponse.redirect(url);
  }

  // 4. Bare /dashboard → redirect to role dashboard
  if (role && isDashboardRoot(req) && req.nextUrl.pathname === "/dashboard") {
    url.pathname =
      role === "ACCOUNTANT" ? "/dashboard/accountant" : "/dashboard/client";
    return NextResponse.redirect(url);
  }

  // 5. Allow shared dashboard routes for any role
  if (isSharedDashboardRoute(req)) {
    return NextResponse.next();
  }

  // 6. CLIENT hitting /dashboard/accountant/* → redirect to client dashboard
  if (role === "CLIENT" && isAccountantRoute(req)) {
    url.pathname = "/dashboard/client";
    return NextResponse.redirect(url);
  }

  // 7. ACCOUNTANT hitting /dashboard/client/* → redirect to accountant dashboard
  if (role === "ACCOUNTANT" && isClientRoute(req)) {
    url.pathname = "/dashboard/accountant";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
