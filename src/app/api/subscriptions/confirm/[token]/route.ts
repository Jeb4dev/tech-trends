import { NextResponse } from "next/server";
import pgPromise from "pg-promise";
import { confirmSubscription } from "@/lib/subscriptions";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const confirmed = await confirmSubscription(db, token);

  if (!confirmed) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>Invalid or already confirmed link</h2>
        <p>This confirmation link is invalid or has already been used.</p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2 style="color:#16a34a">&#10003; Subscription confirmed!</h2>
      <p>You will receive email alerts when new jobs matching your criteria are posted.</p>
      <a href="/advanced-search" style="color:#2563eb">Back to job search</a>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
