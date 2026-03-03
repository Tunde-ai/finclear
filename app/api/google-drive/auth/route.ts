import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOAuth2Client, DRIVE_SCOPES } from "@/lib/google-drive";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: DRIVE_SCOPES,
    prompt: "consent",
    state: clerkId,
  });

  return NextResponse.json({ url: authUrl });
}
