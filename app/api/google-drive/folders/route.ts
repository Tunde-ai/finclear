import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDriveClient } from "@/lib/google-drive";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId: user.id },
  });
  if (!connection) {
    return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 });
  }

  const drive = getDriveClient(
    decrypt(connection.accessToken),
    decrypt(connection.refreshToken)
  );

  const res = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id, name)",
    pageSize: 100,
    orderBy: "name",
  });

  return NextResponse.json({ folders: res.data.files ?? [] });
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { folderId, folderName } = await request.json();
  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
  }

  await prisma.googleDriveConnection.update({
    where: { userId: user.id },
    data: { folderId, folderName: folderName ?? null },
  });

  return NextResponse.json({ success: true });
}
