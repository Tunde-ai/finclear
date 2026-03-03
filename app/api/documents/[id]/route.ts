import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Only the document owner can delete
  if (document.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([document.storagePath]);

  if (storageError) {
    return NextResponse.json(
      { error: `Storage delete failed: ${storageError.message}` },
      { status: 500 }
    );
  }

  // Delete from database
  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
