import type { ReportType } from "@prisma/client";

interface TransactionData {
  date: Date;
  name: string;
  category?: { name: string } | null;
  amount: number | { toNumber(): number };
  account: { name: string };
}

interface AccountData {
  name: string;
  type: string;
  currentBalance: number | { toNumber(): number };
  availableBalance?: number | { toNumber(): number } | null;
}

interface BudgetData {
  category: { name: string };
  amount: number | { toNumber(): number };
  period: string;
}

function toNum(v: number | { toNumber(): number }): number {
  return typeof v === "number" ? v : v.toNumber();
}

export function formatTransactionsForPrompt(
  transactions: TransactionData[]
): string {
  const capped = transactions.slice(0, 500);
  const lines = capped.map((t) => {
    const date = new Date(t.date).toISOString().split("T")[0];
    const category = t.category?.name ?? "Uncategorized";
    const amount = toNum(t.amount).toFixed(2);
    return `${date} | ${t.name} | ${category} | $${amount} | ${t.account.name}`;
  });
  return `Date | Description | Category | Amount | Account\n${lines.join("\n")}`;
}

export function formatAccountsForPrompt(accounts: AccountData[]): string {
  const lines = accounts.map((a) => {
    const current = toNum(a.currentBalance).toFixed(2);
    const available = a.availableBalance
      ? toNum(a.availableBalance).toFixed(2)
      : "N/A";
    return `${a.name} | ${a.type} | $${current} | $${available}`;
  });
  return `Account | Type | Current Balance | Available Balance\n${lines.join("\n")}`;
}

export function formatBudgetsForPrompt(budgets: BudgetData[]): string {
  if (budgets.length === 0) return "No budgets configured.";
  const lines = budgets.map((b) => {
    const amount = toNum(b.amount).toFixed(2);
    return `${b.category.name} | $${amount} | ${b.period}`;
  });
  return `Category | Amount | Period\n${lines.join("\n")}`;
}

export function getReportTitle(
  type: ReportType,
  start?: Date,
  end?: Date
): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
      d
    );
  const now = new Date();

  switch (type) {
    case "MONTHLY_PL":
      return `Monthly P&L - ${start ? fmt(start) : fmt(now)}`;
    case "TAX_DEDUCTIONS":
      return `Tax Deductions Analysis - ${start && end ? `${fmt(start)} to ${fmt(end)}` : fmt(now)}`;
    case "CASH_FLOW_FORECAST":
      return `Cash Flow Forecast - ${fmt(now)}`;
    case "BUSINESS_HEALTH_SCORE":
      return `Business Health Score - ${fmt(now)}`;
  }
}

export function buildReportPrompt(
  type: ReportType,
  transactions: TransactionData[],
  accounts: AccountData[],
  budgets: BudgetData[],
  options?: { forecastDays?: number }
): { system: string; user: string } {
  const txTable = formatTransactionsForPrompt(transactions);
  const acctTable = formatAccountsForPrompt(accounts);
  const budgetTable = formatBudgetsForPrompt(budgets);

  const dataBlock = `## Transaction Data\n${txTable}\n\n## Account Balances\n${acctTable}\n\n## Budget Configuration\n${budgetTable}`;

  switch (type) {
    case "MONTHLY_PL":
      return {
        system:
          "You are a professional CPA preparing a monthly Profit & Loss statement. Format your analysis in clear markdown with tables where appropriate. Be precise with numbers and provide actionable observations.",
        user: `Analyze the following financial data and produce a Monthly Profit & Loss report.\n\nInclude:\n1. **Revenue Summary** — Total income grouped by category\n2. **Expense Breakdown** — Expenses grouped by category with totals\n3. **Net Income** — Revenue minus expenses\n4. **Key Observations** — Notable trends, unusual expenses, or areas of concern\n5. **Recommendations** — 2-3 actionable suggestions\n\n${dataBlock}`,
      };

    case "TAX_DEDUCTIONS":
      return {
        system:
          "You are a tax specialist analyzing transactions for potential tax deductions. Flag each deductible item with a confidence level (HIGH, MEDIUM, LOW). Format your analysis in clear markdown with tables.",
        user: `Analyze the following financial data and identify potential tax deductions.\n\nInclude:\n1. **Deduction Summary Table** — Each deductible transaction with: Date, Description, Amount, Category, Confidence (HIGH/MEDIUM/LOW)\n2. **Deduction Categories** — Group deductions by tax category (Business Expenses, Vehicle, Home Office, etc.)\n3. **Total Estimated Deductions** — Sum by confidence level\n4. **Documentation Needed** — What receipts or records the user should gather\n5. **Tax Savings Estimate** — Approximate savings assuming a 25% effective tax rate\n\n${dataBlock}`,
      };

    case "CASH_FLOW_FORECAST":
      return {
        system:
          "You are a financial forecasting analyst specializing in cash flow projections. Identify recurring patterns and project future cash positions. Format your analysis in clear markdown with tables.",
        user: `Analyze the following financial data and produce a Cash Flow Forecast for the next ${options?.forecastDays ?? 90} days.\n\nInclude:\n1. **Recurring Income** — Identified regular income sources and amounts\n2. **Recurring Expenses** — Identified regular expenses and amounts\n3. **30-Day Projection** — Expected cash position in 30 days\n4. **60-Day Projection** — Expected cash position in 60 days\n5. **90-Day Projection** — Expected cash position in 90 days\n6. **Risk Factors** — Potential threats to cash flow stability\n7. **Opportunities** — Areas where cash flow could be improved\n\n${dataBlock}`,
      };

    case "BUSINESS_HEALTH_SCORE":
      return {
        system:
          "You are a business health assessment specialist. Score businesses across multiple financial dimensions and provide an overall health grade. Format your analysis in clear markdown with tables.",
        user: `Analyze the following financial data and produce a Business Health Score.\n\nScore each dimension from 0-100:\n1. **Liquidity** — Ability to cover short-term obligations\n2. **Income Stability** — Consistency and reliability of income streams\n3. **Expense Management** — How well expenses are controlled relative to income\n4. **Savings Rate** — Percentage of income being saved/retained\n5. **Debt Management** — Credit utilization and debt-to-income indicators\n6. **Budget Adherence** — How well actual spending matches budgets\n\nThen provide:\n- **Overall Score** — Weighted average (0-100)\n- **Letter Grade** — A+ through F\n- **Strengths** — Top 2-3 financial strengths\n- **Areas for Improvement** — Top 2-3 areas needing attention\n- **Action Plan** — Specific steps to improve the weakest dimensions\n\n${dataBlock}`,
      };
  }
}
