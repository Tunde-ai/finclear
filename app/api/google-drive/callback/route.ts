import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-drive";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const clerkId = searchParams.get("state");

  if (!code || !clerkId) {
    return NextResponse.redirect(
      new URL("/dashboard/client/documents?error=missing_params", request.url)
    );
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.redirect(
      new URL("/dashboard/client/documents?error=user_not_found", request.url)
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/dashboard/client/documents?error=no_tokens", request.url)
      );
    }

    await prisma.googleDriveConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000),
      },
      create: {
        userId: user.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000),
      },
    });

    const dashboardPath = user.role === "ACCOUNTANT"
      ? "/dashboard/accountant/documents?drive=connected"
      : "/dashboard/client/documents?drive=connected";

    return NextResponse.redirect(new URL(dashboardPath, request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/client/documents?error=auth_failed", request.url)
    );
  }
}
