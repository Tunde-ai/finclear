import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const request = {
    user: { client_user_id: userId },
    client_name: "FinClear",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  };

  const response = await plaidClient.linkTokenCreate(request);
  return NextResponse.json({ link_token: response.data.link_token });
}
