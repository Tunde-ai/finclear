import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawRole =
      typeof body.role === "string" ? body.role.toUpperCase().trim() : "";

    if (rawRole !== "CLIENT" && rawRole !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const role = rawRole as "CLIENT" | "ACCOUNTANT";

    const clerk = await clerkClient();

    // Set role on Clerk publicMetadata (source of truth for auth)
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        role,
        onboarded: true,
      },
    });

    // Mirror in Prisma (non-blocking — auth works even if DB fails)
    try {
      const clerkUser = await clerk.users.getUser(userId);
      await prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          role,
          onboarded: true,
        },
        create: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          role,
          onboarded: true,
        },
      });
    } catch (dbErr) {
      // Log but don't fail — Clerk metadata is the auth source of truth
      console.error("[set-role] Prisma sync failed (non-fatal):", dbErr);
    }

    return NextResponse.json({ success: true, role });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[set-role] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
