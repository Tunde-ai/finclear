import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { buildReportPrompt, getReportTitle } from "@/lib/report-prompts";
import type { ReportType } from "@prisma/client";

const VALID_TYPES: ReportType[] = [
  "MONTHLY_PL",
  "TAX_DEDUCTIONS",
  "CASH_FLOW_FORECAST",
  "BUSINESS_HEALTH_SCORE",
];

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
    });
  }

  const body = await request.json();
  const { type, dateRangeStart, dateRangeEnd, forecastDays } = body;

  if (!VALID_TYPES.includes(type)) {
    return new Response(JSON.stringify({ error: "Invalid report type" }), {
      status: 400,
    });
  }

  const startDate = dateRangeStart ? new Date(dateRangeStart) : undefined;
  const endDate = dateRangeEnd ? new Date(dateRangeEnd) : undefined;

  // Fetch user's financial data
  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const [transactions, accounts, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      include: { account: true, category: true },
      orderBy: { date: "desc" },
      take: 500,
    }),
    prisma.account.findMany({
      where: { userId: user.id, isActive: true },
    }),
    prisma.budget.findMany({
      where: { userId: user.id },
      include: { category: true },
    }),
  ]);

  if (transactions.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          "No transactions found for the selected period. Connect a bank account and sync transactions first.",
      }),
      { status: 400 }
    );
  }

  const title = getReportTitle(type, startDate, endDate);

  // Create report record
  const report = await prisma.report.create({
    data: {
      userId: user.id,
      type,
      title,
      content: "",
      metadata: {
        transactionCount: transactions.length,
        accountCount: accounts.length,
        dateRange: { start: startDate?.toISOString(), end: endDate?.toISOString() },
      },
    },
  });

  // Build prompt
  const txData = transactions.map((t) => ({
    date: t.date,
    name: t.name,
    category: t.category,
    amount: t.amount,
    account: { name: t.account.name },
  }));
  const acctData = accounts.map((a) => ({
    name: a.name,
    type: a.type,
    currentBalance: a.currentBalance,
    availableBalance: a.availableBalance,
  }));
  const budgetData = budgets.map((b) => ({
    category: { name: b.category.name },
    amount: b.amount,
    period: b.period,
  }));

  const prompt = buildReportPrompt(type, txData, acctData, budgetData, {
    forecastDays,
  });

  // Stream response via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ reportId: report.id });

      let fullContent = "";

      try {
        const messageStream = anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullContent += text;
            send({ text });
          }
        }

        // Save completed report
        await prisma.report.update({
          where: { id: report.id },
          data: { status: "COMPLETED", content: fullContent },
        });

        send({ done: true });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error during generation";
        await prisma.report.update({
          where: { id: report.id },
          data: { status: "FAILED", error: errorMsg },
        });
        send({ error: errorMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
