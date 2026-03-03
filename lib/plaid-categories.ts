const PRIMARY_TO_TAX: Record<string, string> = {
  INCOME: "Income",
  TRANSFER_IN: "Income",
  FOOD_AND_DRINK: "COGS",
  GROCERIES: "COGS",
  GENERAL_MERCHANDISE: "COGS",
  ENTERTAINMENT: "Marketing",
  GENERAL_SERVICES: "Marketing",
  RENT_AND_UTILITIES: "Operations",
  HOME_IMPROVEMENT: "Operations",
  GOVERNMENT_AND_NON_PROFIT: "Operations",
  PERSONAL_CARE: "Operations",
  MEDICAL: "Operations",
  EDUCATION: "Operations",
  BANK_FEES: "Operations",
  LOAN_PAYMENTS: "Operations",
  TRANSPORTATION: "Vehicle",
  TRAVEL: "Vehicle",
};

const UTILITIES_KEYWORDS = ["UTILITIES", "INTERNET", "PHONE", "ELECTRIC", "GAS", "WATER"];

export function mapPlaidCategory(primary: string, detailed?: string): string {
  if (primary === "RENT_AND_UTILITIES" && detailed) {
    const upper = detailed.toUpperCase();
    if (UTILITIES_KEYWORDS.some((kw) => upper.includes(kw))) {
      return "Utilities";
    }
  }
  return PRIMARY_TO_TAX[primary] ?? "Operations";
}
