import { IDatabase } from "pg-promise";
import { nanoid } from "nanoid";
import { sendConfirmationEmail, sendJobDigestEmail, JobDigestItem } from "@/lib/email";

export interface SubscriptionCriteria {
  languages_in?: string[];
  frameworks_in?: string[];
  databases_in?: string[];
  cloud_in?: string[];
  devops_in?: string[];
  dataScience_in?: string[];
  cyberSecurity_in?: string[];
  softSkills_in?: string[];
  positions_in?: string[];
  locations_in?: string[];
  workMode_in?: string[];
  seniority_in?: string[];
}

// Build a SQL WHERE clause (on top of existing conditions) to match subscription criteria
function buildCriteriaConditions(criteria: SubscriptionCriteria, args: any[]): string[] {
  const conditions: string[] = [];

  const TAG_CATEGORY_MAP: [keyof SubscriptionCriteria, string][] = [
    ["languages_in", "languages"],
    ["frameworks_in", "frameworks"],
    ["databases_in", "databases"],
    ["cloud_in", "cloud"],
    ["devops_in", "devops"],
    ["dataScience_in", "dataScience"],
    ["cyberSecurity_in", "cyberSecurity"],
    ["softSkills_in", "softSkills"],
    ["positions_in", "positions"],
    ["locations_in", "locations"],
  ];

  for (const [criteriaKey, category] of TAG_CATEGORY_MAP) {
    const values = criteria[criteriaKey];
    if (values && values.length > 0) {
      const lower = values.map((v) => v.toLowerCase());
      const placeholders = lower.map((_, i) => `$${args.length + i + 1}`).join(",");
      conditions.push(`
        id IN (
          SELECT job_id FROM job_tags jt
          JOIN tags t ON jt.tag_id = t.id
          WHERE t.category = '${category}' AND lower(t.name) IN (${placeholders})
        )
      `);
      args.push(...lower);
    }
  }

  if (criteria.workMode_in && criteria.workMode_in.length > 0) {
    const lower = criteria.workMode_in.map((v) => v.toLowerCase());
    const placeholders = lower.map((_, i) => `$${args.length + i + 1}`).join(",");
    conditions.push(`lower(work_mode) IN (${placeholders})`);
    args.push(...lower);
  }

  if (criteria.seniority_in && criteria.seniority_in.length > 0) {
    const lower = criteria.seniority_in.map((v) => v.toLowerCase());
    const placeholders = lower.map((_, i) => `$${args.length + i + 1}`).join(",");
    conditions.push(`lower(seniority) IN (${placeholders})`);
    args.push(...lower);
  }

  return conditions;
}

export async function createSubscription(
  db: IDatabase<any>,
  email: string,
  criteria: SubscriptionCriteria,
  appBaseUrl: string,
): Promise<{ token: string }> {
  const token = nanoid(32);
  const confirmToken = nanoid(32);

  await db.none(
    `INSERT INTO subscriptions (email, token, confirm_token, confirmed, criteria)
     VALUES ($1, $2, $3, FALSE, $4)`,
    [email, token, confirmToken, JSON.stringify(criteria)],
  );

  const confirmUrl = `${appBaseUrl}/api/subscriptions/confirm/${confirmToken}`;
  await sendConfirmationEmail(email, confirmUrl);

  return { token };
}

export async function confirmSubscription(db: IDatabase<any>, confirmToken: string): Promise<boolean> {
  const result = await db.result(
    `UPDATE subscriptions SET confirmed = TRUE, confirm_token = NULL
     WHERE confirm_token = $1 AND confirmed = FALSE`,
    [confirmToken],
  );
  return result.rowCount > 0;
}

export async function deleteSubscription(db: IDatabase<any>, token: string): Promise<boolean> {
  const result = await db.result(`DELETE FROM subscriptions WHERE token = $1`, [token]);
  return result.rowCount > 0;
}

export async function notifySubscribers(db: IDatabase<any>): Promise<void> {
  const appBaseUrl = process.env.APP_BASE_URL || "https://tech-trends.app";

  // Fetch all confirmed subscriptions
  const subscriptions = await db.any(
    `SELECT id, email, token, criteria, last_notified_at FROM subscriptions WHERE confirmed = TRUE`,
  );

  for (const sub of subscriptions) {
    const criteria: SubscriptionCriteria = sub.criteria || {};
    const args: any[] = [];
    const criteriaConditions = buildCriteriaConditions(criteria, args);

    // Find jobs newer than last_notified_at (or last 24h if never notified)
    const since = sub.last_notified_at
      ? sub.last_notified_at
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const argIndexForDate = args.length + 1;
    args.push(since);

    const allConditions = [
      "active = TRUE",
      `first_seen_at > $${argIndexForDate}`,
      ...criteriaConditions,
    ];

    const whereClause = `WHERE ${allConditions.join(" AND ")}`;

    const jobs: JobDigestItem[] = await db.any(
      `SELECT heading, company_name, municipality_name, work_mode, seniority, slug, date_posted
       FROM jobs ${whereClause}
       ORDER BY date_posted DESC, id DESC
       LIMIT 50`,
      args,
    );

    if (jobs.length === 0) continue;

    const unsubscribeUrl = `${appBaseUrl}/api/subscriptions/unsubscribe/${sub.token}`;

    try {
      // Atomic guard: only update (and send) if last_notified_at hasn't changed since we read it.
      // This prevents duplicate sends if two concurrent sync runs reach this point simultaneously.
      const claimResult = await db.result(
        `UPDATE subscriptions SET last_notified_at = NOW()
         WHERE id = $1 AND (last_notified_at IS NOT DISTINCT FROM $2)`,
        [sub.id, sub.last_notified_at ?? null],
      );
      if (claimResult.rowCount === 0) {
        console.log(`[Subscriptions] Skipping ${sub.email}: already notified by a concurrent run`);
        continue;
      }
      await sendJobDigestEmail(sub.email, jobs, unsubscribeUrl, appBaseUrl);
      console.log(`[Subscriptions] Notified ${sub.email} about ${jobs.length} new job(s)`);
    } catch (e) {
      console.error(`[Subscriptions] Failed to notify ${sub.email}:`, (e as Error).message);
    }
  }
}
