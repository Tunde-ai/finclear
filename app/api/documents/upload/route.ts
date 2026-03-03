import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { supabase, STORAGE_BUCKET, isAllowedFileType, MAX_FILE_SIZE } from "@/lib/supabase";
import { parsePdfTransactions } from "@/lib/pdf-parser";

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!isAllowedFileType(file.type)) {
    return NextResponse.json(
      { error: "File type not supported. Allowed: PDF, JPG, PNG, XLSX, CSV" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 25MB limit" },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${timestamp}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const isPdf = file.type === "application/pdf";

  // Create document record
  const document = await prisma.document.create({
    data: {
      userId: user.id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      storagePath,
      url: urlData.publicUrl,
      parsedStatus: isPdf ? "PARSING" : "SKIPPED",
    },
  });

  // Auto-parse PDFs for transaction data
  if (isPdf) {
    try {
      const transactions = await parsePdfTransactions(buffer);

      if (transactions.length > 0) {
        // Find or create a default account for manual/parsed entries
        let account = await prisma.account.findFirst({
          where: { userId: user.id, name: "Manual / Imported" },
        });
        if (!account) {
          account = await prisma.account.create({
            data: {
              userId: user.id,
              name: "Manual / Imported",
              type: "OTHER",
            },
          });
        }

        // Find or create an "Uncategorized" category
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
              notes: `Parsed from: ${file.name}`,
            },
          });
        }
      }

      await prisma.document.update({
        where: { id: document.id },
        data: {
          parsedStatus: "PARSED",
        },
      });
    } catch (err) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          parsedStatus: "FAILED",
          parseError: err instanceof Error ? err.message : "Unknown parse error",
        },
      });
    }
  }

  const updatedDoc = await prisma.document.findUnique({
    where: { id: document.id },
  });

  return NextResponse.json({ document: updatedDoc });
}
