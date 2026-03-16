import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);

  const dbUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  return NextResponse.json({
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    role: (clerkUser.publicMetadata as Record<string, unknown>)?.role ?? null,
    onboarded: dbUser?.onboarded ?? false,
    createdAt: dbUser?.createdAt ?? null,
  });
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName } = body;

  const clerk = await clerkClient();

  // Update Clerk user name fields
  const updateParams: Record<string, string> = {};
  if (typeof firstName === "string") updateParams.firstName = firstName;
  if (typeof lastName === "string") updateParams.lastName = lastName;

  if (Object.keys(updateParams).length > 0) {
    await clerk.users.updateUser(clerkId, updateParams);
  }

  // Mirror in Prisma
  const dbUser = await prisma.user.update({
    where: { clerkId },
    data: {
      ...(typeof firstName === "string" ? { firstName } : {}),
      ...(typeof lastName === "string" ? { lastName } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
  });
}
