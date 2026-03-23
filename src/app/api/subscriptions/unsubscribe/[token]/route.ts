import { NextResponse } from "next/server";
import pgPromise from "pg-promise";
import { deleteSubscription } from "@/lib/subscriptions";

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

  const deleted = await deleteSubscription(db, token);

  if (!deleted) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>Subscription not found</h2>
        <p>This unsubscribe link is invalid or the subscription has already been removed.</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } },
    );
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2 style="color:#0f172a">Unsubscribed</h2>
      <p style="color:#475569">You have been successfully unsubscribed from job alerts.</p>
      <a href="/advanced-search" style="color:#2563eb">Back to job search</a>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const deleted = await deleteSubscription(db, token);

  if (!deleted) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Unsubscribed successfully" });
}
