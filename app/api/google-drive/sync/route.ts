import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDriveClient, ALLOWED_DRIVE_MIME_TYPES } from "@/lib/google-drive";
import { decrypt } from "@/lib/encryption";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { parsePdfTransactions } from "@/lib/pdf-parser";
import { Readable } from "stream";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST() {
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
  if (!connection || !connection.folderId) {
    return NextResponse.json(
      { error: "No Google Drive folder configured" },
      { status: 400 }
    );
  }

  const drive = getDriveClient(
    decrypt(connection.accessToken),
    decrypt(connection.refreshToken)
  );

  // List files in the selected folder
  const mimeFilter = ALLOWED_DRIVE_MIME_TYPES.map((m) => `mimeType = '${m}'`).join(" or ");
  const res = await drive.files.list({
    q: `'${connection.folderId}' in parents and (${mimeFilter}) and trashed = false`,
    fields: "files(id, name, mimeType, size)",
    pageSize: 100,
  });

  const files = res.data.files ?? [];
  const results: Array<{ name: string; status: string; id?: string }> = [];

  for (const file of files) {
    if (!file.id || !file.name || !file.mimeType) continue;

    // Check if already synced
    const existing = await prisma.document.findUnique({
      where: { googleDriveFileId: file.id },
    });
    if (existing && existing.syncStatus === "SYNCED") {
      results.push({ name: file.name, status: "already_synced", id: existing.id });
      continue;
    }

    // Create or update document record as PENDING
    const doc = existing
      ? await prisma.document.update({
          where: { id: existing.id },
          data: { syncStatus: "PENDING" },
        })
      : await prisma.document.create({
          data: {
            userId: user.id,
            name: file.name,
            size: parseInt(file.size ?? "0"),
            mimeType: file.mimeType,
            storagePath: "",
            url: "",
            googleDriveFileId: file.id,
            syncStatus: "PENDING",
            parsedStatus: file.mimeType === "application/pdf" ? "PENDING" : "SKIPPED",
          },
        });

    try {
      // Download file from Drive
      const downloadRes = await drive.files.get(
        { fileId: file.id, alt: "media" },
        { responseType: "stream" }
      );

      const buffer = await streamToBuffer(downloadRes.data as unknown as Readable);

      // Upload to Supabase
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/gdrive-${timestamp}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.mimeType,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Parse PDF if applicable
      let parsedStatus: "PARSED" | "FAILED" | "SKIPPED" = "SKIPPED";
      if (file.mimeType === "application/pdf") {
        try {
          const transactions = await parsePdfTransactions(buffer);
          if (transactions.length > 0) {
            let account = await prisma.account.findFirst({
              where: { userId: user.id, name: "Manual / Imported" },
            });
            if (!account) {
              account = await prisma.account.create({
                data: { userId: user.id, name: "Manual / Imported", type: "OTHER" },
              });
            }
            const category = await prisma.category.upsert({
              where: { userId_name: { userId: user.id, name: "Uncategorized" } },
              update: {},
              create: { userId: user.id, name: "Uncategorized", isDefault: true },
            });
            for (const tx of transactions) {
              await prisma.transaction.create({
                data: {
                  userId: user.id,
                  accountId: account.id,
                  categoryId: category.id,
                  amount: tx.amount,
                  name: tx.description,
                  date: new Date(tx.date),
                  notes: `Parsed from Google Drive: ${file.name}`,
                },
              });
            }
          }
          parsedStatus = "PARSED";
        } catch {
          parsedStatus = "FAILED";
        }
      }

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          storagePath,
          url: urlData.publicUrl,
          size: buffer.length,
          syncStatus: "SYNCED",
          parsedStatus,
        },
      });

      results.push({ name: file.name, status: "synced", id: doc.id });
    } catch (err) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { syncStatus: "ERROR" },
      });
      results.push({
        name: file.name,
        status: `error: ${err instanceof Error ? err.message : "Unknown"}`,
      });
    }
  }

  await prisma.googleDriveConnection.update({
    where: { userId: user.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({ results, synced: results.filter((r) => r.status === "synced").length });
}
