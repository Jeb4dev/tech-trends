"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Briefcase,
  Target,
  Compass,
  Sparkles,
  Lock,
  Loader2,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Mail,
  BadgeCheck,
} from "lucide-react";

type Mode = "analysis" | "gap" | "career";

type AnalysisResult = {
  atsScore: number;
  recruiterInterest: number;
  decision: "interview" | "consider" | "reject";
  decisionReason: string;
  seniority: "junior" | "mid" | "senior" | "lead" | "unclear";
  profileType: string;
  recruiterSummary: string;
  strengths: string[];
  risks: string[];
  skillGaps: {
    skill: string;
    severity: "critical" | "important" | "nice-to-have";
    advice: string;
  }[];
  topImprovements: { title: string; detail: string }[];
  improvedSummary: string;
  coverLetter: string;
  companyFit: {
    startup: { verdict: "interview" | "consider" | "reject"; reason: string };
    midsize: { verdict: "interview" | "consider" | "reject"; reason: string };
    enterprise: { verdict: "interview" | "consider" | "reject"; reason: string };
  };
  atsNotes: string;
};

type GapResult = {
  coveragePercent: number;
  summary: string;
  matchedSkills: string[];
  gaps: {
    skill: string;
    severity: "critical" | "important" | "nice-to-have";
    learnEffort: "days" | "weeks" | "months" | "quarters";
    nextStep: string;
  }[];
  quickWins: string[];
};

type CareerResult = {
  verdict: string;
  recommendations: {
    role: string;
    fitScore: number;
    jobsInMarket: number;
    reasoning: string;
    youAlreadyHave: string[];
    shouldLearn: string[];
  }[];
  hotSkillsYouHave: string[];
  hotSkillsToLearn: string[];
  overallAdvice: string;
};

type Response =
  | { mode: "analysis"; result: AnalysisResult }
  | { mode: "gap"; result: GapResult }
  | { mode: "career"; result: CareerResult };

const MODES: {
  id: Mode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  requires: "both" | "cv-only";
}[] = [
  {
    id: "analysis",
    title: "Hakemuksen analyysi",
    subtitle: "ATS + rekrytoijan päätös",
    icon: BadgeCheck,
    requires: "both",
  },
  {
    id: "gap",
    title: "Osaamisvaje",
    subtitle: "Mitä puuttuu juuri tähän paikkaan",
    icon: Target,
    requires: "both",
  },
  {
    id: "career",
    title: "Urapolku",
    subtitle: "Sopivimmat roolit Suomen markkinalla",
    icon: Compass,
    requires: "cv-only",
  },
];

export default function CvAnalysisClient() {
  const [mode, setMode] = useState<Mode>("analysis");
  const [cv, setCv] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Response | null>(null);

  const requiresJd = mode !== "career";
  const canSubmit =
    !loading && cv.trim().length >= 120 && (!requiresJd || jd.trim().length >= 80);

  const disabledReason = useMemo(() => {
    if (loading) return "Analysoidaan…";
    if (cv.trim().length < 120) return "Liitä CV (väh. 120 merkkiä).";
    if (requiresJd && jd.trim().length < 80) return "Liitä työpaikkailmoitus (väh. 80 merkkiä).";
    return null;
  }, [loading, cv, jd, requiresJd]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/cv-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, cv, jobDescription: requiresJd ? jd : "" }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Analyysi epäonnistui.");
      } else {
        setData(payload as Response);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Virhe yhteydessä.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Mode tabs */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setData(null);
                  setError(null);
                }}
                className={
                  "group text-left rounded-xl border p-4 transition-all " +
                  (active
                    ? "border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5 shadow-sm shadow-green-500/10"
                    : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600/80 hover:bg-gray-800/50")
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      "p-2 rounded-lg transition-colors " +
                      (active ? "bg-green-500/15 text-green-300" : "bg-gray-700/40 text-gray-400 group-hover:text-gray-300")
                    }
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={"text-sm font-semibold " + (active ? "text-white" : "text-gray-200")}>
                      {m.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.subtitle}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Input form */}
      <section className={"grid gap-5 " + (requiresJd ? "md:grid-cols-2" : "md:grid-cols-1")}>
        <TextCard
          icon={<FileText className="w-4 h-4" />}
          title="CV / Ansioluettelo"
          hint="Liitä CV tekstimuodossa — suomeksi tai englanniksi."
          value={cv}
          onChange={setCv}
          placeholder="Liitä CV tähän…"
        />
        {requiresJd && (
          <TextCard
            icon={<Briefcase className="w-4 h-4" />}
            title="Työpaikkailmoitus"
            hint="Liitä koko ilmoitus — vaatimukset, toivotut taidot, tehtäväkuvaus."
            value={jd}
            onChange={setJd}
            placeholder="Liitä työpaikkailmoituksen teksti tähän…"
          />
        )}
      </section>

      <section className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={
            "inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold transition-all duration-200 " +
            (canSubmit
              ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
              : "bg-gray-700/50 text-gray-400 cursor-not-allowed")
          }
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analysoidaan…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {mode === "career" ? "Etsi sopivat roolit" : "Tee analyysi"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          Tietojasi ei tallenneta. Käsitellään vain analyysin ajaksi.
        </div>
        {disabledReason && !loading && <div className="text-xs text-gray-500">{disabledReason}</div>}
        {error && (
          <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      {data?.mode === "analysis" && <AnalysisView result={data.result} />}
      {data?.mode === "gap" && <GapView result={data.result} />}
      {data?.mode === "career" && <CareerView result={data.result} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared UI
// ──────────────────────────────────────────────────────────────────────────────

function TextCard(props: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1.5 rounded-md bg-green-500/10 text-green-300">{props.icon}</div>
        <h2 className="text-sm font-semibold text-white">{props.title}</h2>
        <span className="ml-auto text-[10px] font-mono text-gray-500">{props.value.length}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{props.hint}</p>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full min-h-[240px] md:min-h-[300px] rounded-lg bg-gray-900/60 border border-gray-700/50 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 resize-y font-mono leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}

function ScoreBar(props: { label: string; value: number; tone?: "green" | "orange" | "red" | "auto" }) {
  const tone = props.tone ?? "auto";
  const resolved =
    tone === "auto" ? (props.value >= 75 ? "green" : props.value >= 50 ? "orange" : "red") : tone;
  const color =
    resolved === "green" ? "bg-green-500" : resolved === "orange" ? "bg-amber-500" : "bg-red-500";
  const text =
    resolved === "green" ? "text-green-300" : resolved === "orange" ? "text-amber-300" : "text-red-300";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">{props.label}</span>
        <span className={"text-lg font-bold font-mono " + text}>{props.value} %</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={"h-full " + color + " transition-all"}
          style={{ width: Math.max(2, props.value) + "%" }}
        />
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const border =
    tone === "good"
      ? "border-green-500/30"
      : tone === "warn"
        ? "border-amber-500/30"
        : tone === "bad"
          ? "border-red-500/30"
          : "border-gray-700/50";
  const bg =
    tone === "good"
      ? "from-green-500/5 to-gray-900/60"
      : tone === "warn"
        ? "from-amber-500/5 to-gray-900/60"
        : tone === "bad"
          ? "from-red-500/5 to-gray-900/60"
          : "from-gray-800/60 to-gray-900/60";
  const iconColor =
    tone === "good"
      ? "text-green-300 bg-green-500/10"
      : tone === "warn"
        ? "text-amber-300 bg-amber-500/10"
        : tone === "bad"
          ? "text-red-300 bg-red-500/10"
          : "text-gray-300 bg-gray-700/40";
  return (
    <div className={`rounded-xl border ${border} bg-gradient-to-br ${bg} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-md ${iconColor}`}>{icon}</div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function decisionLabel(d: "interview" | "consider" | "reject") {
  if (d === "interview") return "Haastattelu";
  if (d === "consider") return "Harkinta";
  return "Hylkäys";
}

function decisionClass(d: "interview" | "consider" | "reject") {
  if (d === "interview") return "text-green-300 bg-green-500/15 border-green-500/30";
  if (d === "consider") return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  return "text-red-300 bg-red-500/15 border-red-500/30";
}

function severityClass(s: "critical" | "important" | "nice-to-have") {
  if (s === "critical") return "text-red-300 bg-red-500/15 border-red-500/30";
  if (s === "important") return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  return "text-gray-300 bg-gray-700/40 border-gray-600/40";
}

function severityLabel(s: "critical" | "important" | "nice-to-have") {
  if (s === "critical") return "Kriittinen";
  if (s === "important") return "Tärkeä";
  return "Kiva olla";
}

function learnEffortLabel(e: "days" | "weeks" | "months" | "quarters") {
  if (e === "days") return "Päivissä";
  if (e === "weeks") return "Viikoissa";
  if (e === "months") return "Kuukausissa";
  return "Kvartaaleissa";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* no-op */
        }
      }}
      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Kopioitu" : "Kopioi"}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 1 — Analysis
// ──────────────────────────────────────────────────────────────────────────────

function AnalysisView({ result }: { result: AnalysisResult }) {
  const seniorityLabel: Record<string, string> = {
    junior: "Junior",
    mid: "Mid-level",
    senior: "Senior",
    lead: "Lead",
    unclear: "Epäselvä",
  };
  return (
    <div className="space-y-5">
      {/* Verdict hero */}
      <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/80 via-gray-900/80 to-black/60 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
              Rekrytointipäätös
            </div>
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-lg md:text-xl font-bold ${decisionClass(result.decision)}`}
            >
              {decisionLabel(result.decision)}
            </div>
            <div className="mt-3 text-sm text-gray-400 max-w-xl leading-relaxed">
              {result.decisionReason}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-800/60 border border-gray-700/50">
                <span className="text-gray-400">Taso:</span>
                <span className="text-gray-200">{seniorityLabel[result.seniority] || result.seniority}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-800/60 border border-gray-700/50">
                <span className="text-gray-400">Profiili:</span>
                <span className="text-gray-200 max-w-[240px] truncate">{result.profileType}</span>
              </span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-4 md:max-w-sm">
            <ScoreBar label="ATS-läpäisytodennäköisyys" value={result.atsScore} />
            <ScoreBar label="Rekrytoijan kiinnostus" value={result.recruiterInterest} />
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-gray-900/60 border border-gray-700/40 p-4">
          <div className="text-xs font-semibold text-gray-400 mb-1">Rekrytoijan yhteenveto</div>
          <p className="text-sm text-gray-200 leading-relaxed">{result.recruiterSummary}</p>
        </div>
      </div>

      {/* Reasons / Risks */}
      <div className="grid gap-5 md:grid-cols-2">
        <Panel icon={<ThumbsUp className="w-4 h-4" />} title="Syitä palkata" tone="good">
          <ul className="space-y-2.5">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel icon={<ThumbsDown className="w-4 h-4" />} title="Riskit / epäselvyydet" tone="bad">
          <ul className="space-y-2.5">
            {result.risks.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-200">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Skill gaps */}
      {result.skillGaps?.length > 0 && (
        <Panel icon={<AlertTriangle className="w-4 h-4" />} title="Osaamisvajeet">
          <ul className="divide-y divide-gray-700/30">
            {result.skillGaps.map((g, i) => (
              <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-100">{g.skill}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityClass(g.severity)}`}
                      >
                        {severityLabel(g.severity)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{g.advice}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Top improvements */}
      {result.topImprovements?.length > 0 && (
        <Panel icon={<TrendingUp className="w-4 h-4" />} title="Kolme tärkeintä muutosta" tone="warn">
          <ol className="space-y-3">
            {result.topImprovements.map((imp, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{imp.title}</div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{imp.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* Company fit */}
      <Panel icon={<Briefcase className="w-4 h-4" />} title="Miten profiili menestyy yritystyypeittäin">
        <div className="grid gap-3 md:grid-cols-3">
          <CompanyFitCard label="Startup (10–50)" entry={result.companyFit.startup} />
          <CompanyFitCard label="PK-yritys (50–200)" entry={result.companyFit.midsize} />
          <CompanyFitCard label="Suuryritys (500+)" entry={result.companyFit.enterprise} />
        </div>
      </Panel>

      {/* ATS notes */}
      <Panel icon={<BadgeCheck className="w-4 h-4" />} title="ATS / Rekrytoijan näkemys">
        <p className="text-sm text-gray-300 leading-relaxed">{result.atsNotes}</p>
      </Panel>

      {/* Improved summary */}
      <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-green-500/10 text-green-300">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white flex-1">Parannettu profiilitiivistelmä</h3>
          <CopyButton text={result.improvedSummary} />
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs text-gray-200 bg-gray-900/60 border border-gray-700/40 rounded-lg p-4 leading-relaxed">
          {result.improvedSummary}
        </pre>
      </div>

      {/* Cover letter */}
      <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-green-500/10 text-green-300">
            <Mail className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white flex-1">Saatekirjeluonnos</h3>
          <CopyButton text={result.coverLetter} />
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs text-gray-200 bg-gray-900/60 border border-gray-700/40 rounded-lg p-4 leading-relaxed">
          {result.coverLetter}
        </pre>
      </div>
    </div>
  );
}

function CompanyFitCard(props: {
  label: string;
  entry: { verdict: "interview" | "consider" | "reject"; reason: string };
}) {
  return (
    <div className="rounded-lg bg-gray-900/60 border border-gray-700/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-300">{props.label}</span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${decisionClass(props.entry.verdict)}`}
        >
          {decisionLabel(props.entry.verdict)}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{props.entry.reason}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 2 — Skill gap
// ──────────────────────────────────────────────────────────────────────────────

function GapView({ result }: { result: GapResult }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6">
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="text-center md:text-left">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
              Vaatimusten kattavuus
            </div>
            <div className="text-5xl font-extrabold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {result.coveragePercent}%
            </div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {result.matchedSkills?.length > 0 && (
          <Panel icon={<CheckCircle2 className="w-4 h-4" />} title="Täsmää vaatimuksiin" tone="good">
            <div className="flex flex-wrap gap-1.5">
              {result.matchedSkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-200 border border-green-500/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </Panel>
        )}
        {result.quickWins?.length > 0 && (
          <Panel icon={<TrendingUp className="w-4 h-4" />} title="Nopeat voitot CV:hen" tone="warn">
            <ul className="space-y-2">
              {result.quickWins.map((w, i) => (
                <li key={i} className="text-sm text-gray-200 flex gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 mt-1 flex-shrink-0" />
                  <span className="leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {result.gaps?.length > 0 && (
        <Panel icon={<AlertTriangle className="w-4 h-4" />} title="Osaamisvajeet ja oppimispolku">
          <div className="space-y-3">
            {result.gaps.map((g, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-900/60 border border-gray-700/40 p-4"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-sm font-semibold text-white">{g.skill}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityClass(g.severity)}`}
                  >
                    {severityLabel(g.severity)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-gray-600/40 bg-gray-800/60 text-gray-300">
                    {learnEffortLabel(g.learnEffort)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-gray-500 font-medium">Seuraava askel:</span> {g.nextStep}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 3 — Career fit
// ──────────────────────────────────────────────────────────────────────────────

function CareerView({ result }: { result: CareerResult }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
          Markkinakatsaus profiiliisi
        </div>
        <p className="text-sm md:text-base text-gray-200 leading-relaxed">{result.verdict}</p>
      </div>

      {/* Recommendations */}
      <div className="grid gap-4 md:grid-cols-2">
        {result.recommendations?.map((rec, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Suositus #{i + 1}
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">{rec.role}</h3>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold font-mono text-green-300">{rec.fitScore}%</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sopivuus</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">{rec.reasoning}</p>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
              <Briefcase className="w-3 h-3" />
              <span>Avoimia paikkoja Suomessa:</span>
              <span className="text-gray-200 font-mono">{rec.jobsInMarket}</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-green-400/80 mb-1">
                  Vahvuutesi tähän rooliin
                </div>
                <div className="flex flex-wrap gap-1">
                  {rec.youAlreadyHave.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-200 border border-green-500/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-amber-400/80 mb-1">
                  Kasvukohteet
                </div>
                <div className="flex flex-wrap gap-1">
                  {rec.shouldLearn.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-200 border border-amber-500/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel icon={<BadgeCheck className="w-4 h-4" />} title="Kysyttyjä taitoja jotka sinulla on" tone="good">
          {result.hotSkillsYouHave.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.hotSkillsYouHave.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-200 border border-green-500/20"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Ei löydy suoraan kysytyimpien joukosta.</p>
          )}
        </Panel>
        <Panel icon={<TrendingUp className="w-4 h-4" />} title="Kysyttyjä taitoja joita kannattaisi oppia" tone="warn">
          {result.hotSkillsToLearn.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.hotSkillsToLearn.map((s) => (
                <Link
                  key={s}
                  href={`/advanced-search?rawQuery=${encodeURIComponent(s)}`}
                  className="text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-200 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Profiilisi kattaa kysytyt teknologiat hyvin.</p>
          )}
        </Panel>
      </div>

      <Panel icon={<Compass className="w-4 h-4" />} title="Strateginen neuvo">
        <p className="text-sm text-gray-200 leading-relaxed">{result.overallAdvice}</p>
      </Panel>
    </div>
  );
}
