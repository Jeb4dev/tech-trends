import { NextResponse } from "next/server";
import pgPromise from "pg-promise";
import { createSubscription, SubscriptionCriteria } from "@/lib/subscriptions";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; criteria?: SubscriptionCriteria };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, criteria } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (!criteria || typeof criteria !== "object") {
    return NextResponse.json({ error: "criteria object is required" }, { status: 400 });
  }

  // Require at least one filter
  const hasFilter = Object.values(criteria).some((v) => Array.isArray(v) && v.length > 0);
  if (!hasFilter) {
    return NextResponse.json({ error: "At least one filter criterion is required" }, { status: 400 });
  }

  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (request.headers.get("origin") ?? "http://localhost:3000");

  try {
    const { token } = await createSubscription(db, email.toLowerCase().trim(), criteria, appBaseUrl);
    return NextResponse.json({
      message: "Subscription created. Please check your email to confirm.",
      token,
    });
  } catch (e) {
    console.error("[POST /api/subscriptions]", e);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
