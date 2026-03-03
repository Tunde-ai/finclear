import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
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

  const { sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role as
    | "CLIENT"
    | "ACCOUNTANT"
    | undefined;

  const url = req.nextUrl.clone();

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
