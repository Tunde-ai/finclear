import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@finclear.app" },
    update: {},
    create: {
      clerkId: "demo_clerk_id",
      email: "demo@finclear.app",
      firstName: "Demo",
      lastName: "User",
      role: "CLIENT",
      onboarded: true,
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create accounts
  const checking = await prisma.account.upsert({
    where: { id: "demo-checking" },
    update: {},
    create: {
      id: "demo-checking",
      userId: user.id,
      name: "Business Checking",
      type: "CHECKING",
      currentBalance: 12450.75,
      availableBalance: 12350.0,
    },
  });

  const savings = await prisma.account.upsert({
    where: { id: "demo-savings" },
    update: {},
    create: {
      id: "demo-savings",
      userId: user.id,
      name: "Business Savings",
      type: "SAVINGS",
      currentBalance: 25000.0,
      availableBalance: 25000.0,
    },
  });

  console.log("Created accounts");

  // Create categories
  const categories = [
    { name: "Income", color: "#059669" },
    { name: "Food Supplies", color: "#d97706" },
    { name: "Packaging", color: "#2563eb" },
    { name: "Marketing", color: "#dc2626" },
    { name: "Vendor Fees", color: "#7c3aed" },
    { name: "Transportation", color: "#ec4899" },
    { name: "Equipment", color: "#f59e0b" },
    { name: "Utilities", color: "#6b7280" },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: cat.name } },
      update: {},
      create: { userId: user.id, name: cat.name, color: cat.color },
    });
    categoryMap[cat.name] = c.id;
  }

  console.log("Created categories");

  // Create demo transactions
  const now = new Date();
  const txns = [
    { name: "Lake Nona Farmers Market", amount: -85.0, cat: "Vendor Fees", days: 2 },
    { name: "Costco - Scotch Bonnet Peppers", amount: -42.5, cat: "Food Supplies", days: 3 },
    { name: "Market Sales - Jerk Sauce", amount: 340.0, cat: "Income", days: 2 },
    { name: "Amazon - Glass Bottles", amount: -68.99, cat: "Packaging", days: 5 },
    { name: "Meta Ads - March Campaign", amount: -50.0, cat: "Marketing", days: 4 },
    { name: "Las Olas Market Sales", amount: 520.0, cat: "Income", days: 7 },
    { name: "Winn Dixie - Allspice", amount: -18.75, cat: "Food Supplies", days: 8 },
    { name: "Wholesale Order - Caribbean Store", amount: 800.0, cat: "Income", days: 10 },
    { name: "Fort Lauderdale Vendor Fee", amount: -120.0, cat: "Vendor Fees", days: 9 },
    { name: "Gas - Market Day Transport", amount: -45.0, cat: "Transportation", days: 2 },
    { name: "Instagram Boost - Escovitch", amount: -25.0, cat: "Marketing", days: 6 },
    { name: "Restaurant Depot - Scotch Bonnets", amount: -95.0, cat: "Food Supplies", days: 12 },
    { name: "Orlando Market Sales", amount: 280.0, cat: "Income", days: 14 },
    { name: "Printer Ink - Labels", amount: -32.0, cat: "Packaging", days: 15 },
    { name: "Lake Nona Market Sales", amount: 410.0, cat: "Income", days: 16 },
  ];

  for (const tx of txns) {
    const date = new Date(now);
    date.setDate(date.getDate() - tx.days);
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: tx.amount > 0 ? checking.id : checking.id,
        name: tx.name,
        amount: Math.abs(tx.amount),
        date,
        categoryId: categoryMap[tx.cat],
      },
    });
  }

  console.log(`Created ${txns.length} transactions`);

  // Create market sales
  const marketSales = [
    { date: 2, location: "Lake Nona", product: "Jerk Sauce", qty: 12, price: 12, type: "RETAIL", fee: 85 },
    { date: 2, location: "Lake Nona", product: "Escovitch Sauce", qty: 8, price: 12, type: "RETAIL", fee: 0 },
    { date: 2, location: "Lake Nona", product: "Pepper Sauce", qty: 6, price: 10, type: "RETAIL", fee: 0 },
    { date: 7, location: "Las Olas", product: "Jerk Sauce", qty: 18, price: 12, type: "RETAIL", fee: 100 },
    { date: 7, location: "Las Olas", product: "Jerk Seasoning", qty: 10, price: 8, type: "RETAIL", fee: 0 },
    { date: 7, location: "Las Olas", product: "Escovitch Sauce", qty: 12, price: 12, type: "RETAIL", fee: 0 },
    { date: 9, location: "Fort Lauderdale", product: "Jerk Sauce", qty: 15, price: 12, type: "RETAIL", fee: 120 },
    { date: 10, location: "Wholesale", product: "Jerk Sauce", qty: 48, price: 8, type: "WHOLESALE", fee: 0 },
    { date: 10, location: "Wholesale", product: "Escovitch Sauce", qty: 24, price: 8, type: "WHOLESALE", fee: 0 },
    { date: 14, location: "Orlando", product: "Jerk Sauce", qty: 10, price: 12, type: "RETAIL", fee: 75 },
    { date: 14, location: "Orlando", product: "Pepper Sauce", qty: 8, price: 10, type: "RETAIL", fee: 0 },
    { date: 16, location: "Lake Nona", product: "Jerk Sauce", qty: 14, price: 12, type: "RETAIL", fee: 85 },
    { date: 16, location: "Lake Nona", product: "Sorrel Drink", qty: 20, price: 6, type: "RETAIL", fee: 0 },
  ];

  for (const s of marketSales) {
    const date = new Date(now);
    date.setDate(date.getDate() - s.date);
    await prisma.marketSale.create({
      data: {
        userId: user.id,
        date,
        location: s.location,
        product: s.product,
        quantity: s.qty,
        unitPrice: s.price,
        totalSale: s.qty * s.price,
        saleType: s.type,
        vendorFee: s.fee || null,
      },
    });
  }

  console.log(`Created ${marketSales.length} market sales`);

  // Create cost entries
  const costs = [
    { days: 3, supplier: "Costco", item: "Scotch Bonnet Peppers (5lb)", qty: 3, cost: 14.17 },
    { days: 5, supplier: "Amazon", item: "Glass Bottles 8oz (24pk)", qty: 2, cost: 34.5 },
    { days: 8, supplier: "Winn Dixie", item: "Allspice (bulk)", qty: 2, cost: 9.38 },
    { days: 12, supplier: "Restaurant Depot", item: "Scotch Bonnets (case)", qty: 1, cost: 95.0 },
    { days: 15, supplier: "Amazon", item: "Label Stickers (500ct)", qty: 1, cost: 32.0 },
  ];

  for (const c of costs) {
    const date = new Date(now);
    date.setDate(date.getDate() - c.days);
    await prisma.costEntry.create({
      data: {
        userId: user.id,
        date,
        supplier: c.supplier,
        item: c.item,
        quantity: c.qty,
        unitCost: c.cost,
        totalCost: c.qty * c.cost,
      },
    });
  }

  console.log(`Created ${costs.length} cost entries`);

  // Create ad spend entries
  const ads = [
    { days: 4, platform: "Meta Ads", campaign: "March Jerk Sauce", spend: 50, clicks: 312, revenue: 180 },
    { days: 6, platform: "Instagram", campaign: "Escovitch Boost", spend: 25, clicks: 187, revenue: 96 },
    { days: 11, platform: "Meta Ads", campaign: "Wholesale Promo", spend: 30, clicks: 95, revenue: 400 },
  ];

  for (const a of ads) {
    const date = new Date(now);
    date.setDate(date.getDate() - a.days);
    await prisma.adSpend.create({
      data: {
        userId: user.id,
        date,
        platform: a.platform,
        campaign: a.campaign,
        spend: a.spend,
        clicks: a.clicks,
        revenue: a.revenue,
      },
    });
  }

  console.log(`Created ${ads.length} ad spend entries`);

  // Create budgets
  await prisma.budget.create({
    data: {
      userId: user.id,
      categoryId: categoryMap["Food Supplies"],
      amount: 500,
      period: "MONTHLY",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    },
  });

  await prisma.budget.create({
    data: {
      userId: user.id,
      categoryId: categoryMap["Marketing"],
      amount: 200,
      period: "MONTHLY",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    },
  });

  console.log("Created budgets");

  // Create subscription
  await prisma.subscription.upsert({
    where: { id: "demo-subscription" },
    update: {},
    create: {
      id: "demo-subscription",
      userId: user.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
    },
  });

  console.log("Created subscription");
  console.log("Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
