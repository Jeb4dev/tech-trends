import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "noreply@tech-trends.app";

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { transport, from };
}

export interface JobDigestItem {
  heading: string;
  company_name: string | null;
  municipality_name: string | null;
  work_mode: string | null;
  seniority: string | null;
  slug: string;
  date_posted: string | null;
}

export async function sendConfirmationEmail(email: string, confirmUrl: string) {
  const { transport, from } = createTransport();

  await transport.sendMail({
    from,
    to: email,
    subject: "Confirm your Tech Trends job alert",
    text: `Click the link below to confirm your job alert subscription:\n\n${confirmUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Confirm your job alert</h2>
        <p style="color:#475569">You signed up for job alerts on Tech Trends. Click the button below to confirm your subscription.</p>
        <a href="${confirmUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Confirm subscription</a>
        <p style="color:#94a3b8;font-size:13px">Or copy this link into your browser:<br/>${confirmUrl}</p>
        <p style="color:#94a3b8;font-size:13px">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendJobDigestEmail(
  email: string,
  jobs: JobDigestItem[],
  unsubscribeUrl: string,
  appBaseUrl: string,
) {
  const { transport, from } = createTransport();

  const jobLines = jobs
    .map(
      (j) =>
        `• ${j.heading || "Untitled"} at ${j.company_name || "Unknown company"}` +
        (j.municipality_name ? ` — ${j.municipality_name}` : "") +
        (j.work_mode ? ` [${j.work_mode}]` : "") +
        (j.seniority ? ` (${j.seniority})` : "") +
        `\n  ${appBaseUrl}/advanced-search?slug=${j.slug}`,
    )
    .join("\n\n");

  const jobCards = jobs
    .map(
      (j) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px">
        <a href="${appBaseUrl}/advanced-search?slug=${j.slug}" style="font-size:15px;font-weight:600;color:#1d4ed8;text-decoration:none">
          ${j.heading || "Untitled position"}
        </a>
        <div style="color:#475569;margin-top:4px;font-size:14px">
          ${j.company_name || "Unknown company"}
          ${j.municipality_name ? ` &middot; ${j.municipality_name}` : ""}
          ${j.work_mode ? ` &middot; ${j.work_mode}` : ""}
          ${j.seniority ? ` &middot; ${j.seniority}` : ""}
        </div>
      </div>`,
    )
    .join("");

  await transport.sendMail({
    from,
    to: email,
    subject: `${jobs.length} new job${jobs.length > 1 ? "s" : ""} matching your Tech Trends alert`,
    text:
      `${jobs.length} new job${jobs.length > 1 ? "s" : ""} matching your criteria:\n\n${jobLines}\n\n` +
      `Unsubscribe: ${unsubscribeUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">${jobs.length} new job${jobs.length > 1 ? "s" : ""} for you</h2>
        <p style="color:#475569">New listings matching your job alert criteria on Tech Trends:</p>
        ${jobCards}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:13px">
          <a href="${unsubscribeUrl}" style="color:#94a3b8">Unsubscribe</a> from these alerts.
        </p>
      </div>
    `,
  });
}
