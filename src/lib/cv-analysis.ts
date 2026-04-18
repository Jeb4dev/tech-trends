import "server-only";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

// Cap the amount of text we send to the model to keep latency and cost predictable.
const MAX_CHARS = 15000;
function truncate(s: string, max = MAX_CHARS) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 1 — Full application analysis (ATS + recruiter + decision + rewrite)
// ──────────────────────────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM = `Olet kokenut suomalainen IT-alan teknologiarekrytoija ja ATS-järjestelmäasiantuntija. Analysoit hakijan CV:n ja työpaikkailmoituksen kuten todellinen rekrytointitiimi analysoisi: ensin ATS-järjestelmän avainsanapohjainen seulonta, sitten ihminen (teknologiarekrytoija) joka arvioi todellisen sopivuuden.

Sinun on oltava rehellinen ja kriittinen. Älä anna korkeita pisteitä ilman selviä perusteita. Kirjoita kaikki vastaukset sujuvalla suomen kielellä, paitsi teknologioiden nimet (React, TypeScript jne.) joita ei käännetä.

Arviointiohjeet:
- ATS-läpäisytodennäköisyys (0–100): Kuinka suurella todennäköisyydellä hakemus läpäisee automaattisen avainsanaseulonnan. Perustuu vaadittujen teknologioiden, tittelien ja kokemusvuosien esiintymiseen CV:ssä. Anna realistinen arvio — täydellinen 95%+ vaatii lähes kaikkien vaadittujen avainsanojen selkeän esiintymisen.
- Rekrytoijan kiinnostus (0–100): Kuinka kiinnostava profiili on ihmisrekrytoijalle. Huomioi kokemuksen laatu, edistyminen uralla, relevanttius, työnäytöt ja viestintä.
- Päätös: "interview" (yli 70% molemmissa ja ei suuria puutteita), "consider" (kohtuullinen sopivuus mutta puutteita), "reject" (selviä estäviä puutteita).
- Vahvuudet: 3–5 konkreettista kohtaa joissa hakija täyttää vaatimukset. Mainitse mistä CV:n osasta havainto tulee.
- Riskit palkata: 2–5 konkreettista puutetta tai epäselvyyttä joiden vuoksi rekrytoija voisi epäröidä.
- Osaamisvajeet: Vaaditut/toivotut taidot jotka puuttuvat CV:stä. Jokaiselle vakavuusaste ja yksi selkeä neuvo.
- 3 konkreettista CV-muutosta: Tärkeimmät kirjoittamisen/rakenteen muutokset jotka parantaisivat hakemusta juuri tähän paikkaan.
- Parempi profiilitiivistelmä: Kirjoita hakijalle 3–4 lauseen profiilitiivistelmä joka korostaa relevanteimpia asioita tätä hakua varten. Käytä ensimmäistä persoonaa.
- Saatekirjeluonnos: 150–220 sanaa, ammattimainen ja suora, suomeksi. Viittaa konkreettisesti työnkuvaan ja hakijan relevantimpiin projekteihin. Vältä kliseitä ("olen innokas tiimipelaaja").
- Yritystyyppisopivuus: Miten profiili pärjää startup (10–50), pk-yritys (50–200) ja suuryritys (500+) -ympäristöissä (1 lause per tyyppi + lipuke Haastattelu/Harkinta/Hylkäys).

Älä keksi tietoja joita CV:ssä ei ole. Jos jotain ei mainita, sano se suoraan.`;

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  required: [
    "atsScore",
    "recruiterInterest",
    "decision",
    "decisionReason",
    "seniority",
    "profileType",
    "strengths",
    "risks",
    "skillGaps",
    "topImprovements",
    "improvedSummary",
    "coverLetter",
    "companyFit",
    "atsNotes",
    "recruiterSummary",
  ],
  properties: {
    atsScore: {
      type: Type.INTEGER,
      description: "0–100. Todennäköisyys että hakemus läpäisee ATS-järjestelmän avainsanasuodattimen.",
    },
    recruiterInterest: {
      type: Type.INTEGER,
      description: "0–100. Kuinka kiinnostava profiili on ihmisrekrytoijalle.",
    },
    decision: {
      type: Type.STRING,
      description: "Lopullinen päätös.",
      enum: ["interview", "consider", "reject"],
    },
    decisionReason: {
      type: Type.STRING,
      description: "1–2 lausetta joilla perustellaan päätös.",
    },
    seniority: {
      type: Type.STRING,
      description: "Hakijan arvioitu taso ilmoitukseen verrattuna.",
      enum: ["junior", "mid", "senior", "lead", "unclear"],
    },
    profileType: {
      type: Type.STRING,
      description: "Lyhyt kuvaus hakijan profiilista (esim. 'Full-stack + yrittäjä').",
    },
    recruiterSummary: {
      type: Type.STRING,
      description: "3–4 lauseen kokonaisarvio rekrytoijan näkökulmasta suomeksi.",
    },
    strengths: {
      type: Type.ARRAY,
      description: "3–5 konkreettista syytä palkata.",
      items: { type: Type.STRING },
    },
    risks: {
      type: Type.ARRAY,
      description: "2–5 riskiä tai puutetta.",
      items: { type: Type.STRING },
    },
    skillGaps: {
      type: Type.ARRAY,
      description: "Vaaditut taidot jotka puuttuvat tai jäävät epäselviksi CV:ssä.",
      items: {
        type: Type.OBJECT,
        required: ["skill", "severity", "advice"],
        properties: {
          skill: { type: Type.STRING, description: "Taidon tai teknologian nimi." },
          severity: {
            type: Type.STRING,
            enum: ["critical", "important", "nice-to-have"],
            description: "Kuinka kriittinen puute on tämän roolin kannalta.",
          },
          advice: { type: Type.STRING, description: "Yksi konkreettinen neuvo hakijalle." },
        },
      },
    },
    topImprovements: {
      type: Type.ARRAY,
      description: "Kolme konkreettista muutosta CV:hen tärkeysjärjestyksessä.",
      items: {
        type: Type.OBJECT,
        required: ["title", "detail"],
        properties: {
          title: { type: Type.STRING, description: "Lyhyt otsikko (1–6 sanaa)." },
          detail: { type: Type.STRING, description: "1–2 lausetta konkreettista toteutusta." },
        },
      },
    },
    improvedSummary: {
      type: Type.STRING,
      description: "Parannettu 3–4 lauseen profiilitiivistelmä juuri tätä hakua varten, 1. persoonassa.",
    },
    coverLetter: {
      type: Type.STRING,
      description: "Saatekirjeluonnos suomeksi, 150–220 sanaa, ammattimainen ja hakukohtainen.",
    },
    companyFit: {
      type: Type.OBJECT,
      required: ["startup", "midsize", "enterprise"],
      properties: {
        startup: {
          type: Type.OBJECT,
          required: ["verdict", "reason"],
          properties: {
            verdict: { type: Type.STRING, enum: ["interview", "consider", "reject"] },
            reason: { type: Type.STRING, description: "1 lauseen perustelu." },
          },
        },
        midsize: {
          type: Type.OBJECT,
          required: ["verdict", "reason"],
          properties: {
            verdict: { type: Type.STRING, enum: ["interview", "consider", "reject"] },
            reason: { type: Type.STRING },
          },
        },
        enterprise: {
          type: Type.OBJECT,
          required: ["verdict", "reason"],
          properties: {
            verdict: { type: Type.STRING, enum: ["interview", "consider", "reject"] },
            reason: { type: Type.STRING },
          },
        },
      },
    },
    atsNotes: {
      type: Type.STRING,
      description: "2–3 lausetta ATS:n näkökulmasta: mitä avainsanoja löytyi tai puuttuu.",
    },
  },
};

export interface SkillGap {
  skill: string;
  severity: "critical" | "important" | "nice-to-have";
  advice: string;
}

export interface TopImprovement {
  title: string;
  detail: string;
}

export interface CompanyFitEntry {
  verdict: "interview" | "consider" | "reject";
  reason: string;
}

export interface CvAnalysisResult {
  atsScore: number;
  recruiterInterest: number;
  decision: "interview" | "consider" | "reject";
  decisionReason: string;
  seniority: "junior" | "mid" | "senior" | "lead" | "unclear";
  profileType: string;
  recruiterSummary: string;
  strengths: string[];
  risks: string[];
  skillGaps: SkillGap[];
  topImprovements: TopImprovement[];
  improvedSummary: string;
  coverLetter: string;
  companyFit: {
    startup: CompanyFitEntry;
    midsize: CompanyFitEntry;
    enterprise: CompanyFitEntry;
  };
  atsNotes: string;
}

export async function analyzeApplication(
  cv: string,
  jobDescription: string,
): Promise<CvAnalysisResult> {
  const client = getClient();

  const prompt = `Analysoi seuraava hakemus. Palauta JSON määritellyn skeeman mukaisesti.

========= TYÖPAIKKAILMOITUS =========
${truncate(jobDescription)}

========= CV / ANSIOLUETTELO =========
${truncate(cv)}
========= LOPPU =========

Muista: ole rehellinen, konkreettinen ja hakukohtainen. Mainitse vain asiat jotka todella lukevat CV:ssä.`;

  const response = await client.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: [{ text: ANALYSIS_SYSTEM }],
      temperature: 0.4,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Tyhjä vastaus Gemini-malilta");

  const parsed = JSON.parse(text) as CvAnalysisResult;
  // Clamp numeric scores defensively
  parsed.atsScore = Math.max(0, Math.min(100, parsed.atsScore ?? 0));
  parsed.recruiterInterest = Math.max(0, Math.min(100, parsed.recruiterInterest ?? 0));
  return parsed;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 2 — Skill-gap only (lighter, faster, Flash)
// ──────────────────────────────────────────────────────────────────────────────

const GAP_SYSTEM = `Olet suomalainen IT-alan uraohjaaja ja teknologiarekrytoija. Vertaat hakijan CV:tä työpaikkailmoitukseen ja tunnistat osaamisvajeet.

Tavoite: anna hakijalle selkeä lista siitä mitä puuttuu, miten kriittinen puute on, paljonko aikaa menisi oppia, ja yksi konkreettinen seuraava askel. Älä keksi puutteita joita ei ole — jos CV kattaa vaatimuksen, älä listaa sitä.

Kirjoita suomeksi. Teknologioiden nimet pysyvät englanniksi.`;

const GAP_SCHEMA = {
  type: Type.OBJECT,
  required: ["coveragePercent", "matchedSkills", "gaps", "quickWins", "summary"],
  properties: {
    coveragePercent: {
      type: Type.INTEGER,
      description: "0–100. Kuinka suuri osa ilmoituksen vaatimuksista täyttyy CV:ssä.",
    },
    summary: {
      type: Type.STRING,
      description: "2–3 lauseen yhteenveto suomeksi.",
    },
    matchedSkills: {
      type: Type.ARRAY,
      description: "Ilmoituksen vaatimukset jotka löytyvät CV:stä.",
      items: { type: Type.STRING },
    },
    gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["skill", "severity", "learnEffort", "nextStep"],
        properties: {
          skill: { type: Type.STRING },
          severity: {
            type: Type.STRING,
            enum: ["critical", "important", "nice-to-have"],
          },
          learnEffort: {
            type: Type.STRING,
            enum: ["days", "weeks", "months", "quarters"],
            description: "Karkea arvio paljonko aikaa menisi riittävään tasoon.",
          },
          nextStep: {
            type: Type.STRING,
            description: "Yksi konkreettinen seuraava askel (kurssi, projekti, sertifikaatti).",
          },
        },
      },
    },
    quickWins: {
      type: Type.ARRAY,
      description: "Asiat jotka hakijalla jo on, mutta jotka kannattaisi nostaa paremmin esiin CV:ssä.",
      items: { type: Type.STRING },
    },
  },
};

export interface SkillGapEntry {
  skill: string;
  severity: "critical" | "important" | "nice-to-have";
  learnEffort: "days" | "weeks" | "months" | "quarters";
  nextStep: string;
}

export interface SkillGapResult {
  coveragePercent: number;
  summary: string;
  matchedSkills: string[];
  gaps: SkillGapEntry[];
  quickWins: string[];
}

export async function analyzeSkillGap(
  cv: string,
  jobDescription: string,
): Promise<SkillGapResult> {
  const client = getClient();

  const prompt = `Vertaa CV:tä ja ilmoitusta. Palauta JSON.

========= TYÖPAIKKAILMOITUS =========
${truncate(jobDescription)}

========= CV =========
${truncate(cv)}
========= LOPPU =========`;

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: [{ text: GAP_SYSTEM }],
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: GAP_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Tyhjä vastaus Gemini-malilta");
  const parsed = JSON.parse(text) as SkillGapResult;
  parsed.coveragePercent = Math.max(0, Math.min(100, parsed.coveragePercent ?? 0));
  return parsed;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 3 — CV only → extract skills (used with DB to match roles)
// ──────────────────────────────────────────────────────────────────────────────

const PROFILE_SYSTEM = `Olet rekrytointianalytiikan asiantuntija. Tehtäväsi on lukea hakijan CV ja poimia siitä strukturoidut osaamistiedot jotka voidaan sovittaa työmarkkinadataan.

Säännöt:
- Käytä vain asioita jotka CV:ssä oikeasti mainitaan. Älä keksi.
- Teknologioiden nimet aina täsmällisessä muodossa (React, PostgreSQL, TypeScript, AWS, Kubernetes jne.).
- Seniority valitaan kokonaisvuosien perusteella: Junior 0–2, Mid 3–5, Senior 6–9, Lead 10+ JA tiimin vetovastuu.
- Palauta vain listoja ja perusmuotoisia stringejä.`;

const PROFILE_SCHEMA = {
  type: Type.OBJECT,
  required: [
    "yearsOfExperience",
    "seniority",
    "primaryRoles",
    "languages",
    "frameworks",
    "databases",
    "cloud",
    "devops",
    "dataScience",
    "cyberSecurity",
    "softSkills",
    "industries",
    "preferredLocations",
    "profileSummary",
  ],
  properties: {
    yearsOfExperience: {
      type: Type.INTEGER,
      description: "Arvioidut kokonaisvuodet ohjelmistoalalta. 0 jos ei selviä.",
    },
    seniority: {
      type: Type.STRING,
      enum: ["junior", "mid", "senior", "lead", "unclear"],
    },
    primaryRoles: {
      type: Type.ARRAY,
      description: "1–3 keskeistä roolia (esim. 'Full Stack', 'Data Engineer').",
      items: { type: Type.STRING },
    },
    languages: { type: Type.ARRAY, items: { type: Type.STRING } },
    frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
    databases: { type: Type.ARRAY, items: { type: Type.STRING } },
    cloud: { type: Type.ARRAY, items: { type: Type.STRING } },
    devops: { type: Type.ARRAY, items: { type: Type.STRING } },
    dataScience: { type: Type.ARRAY, items: { type: Type.STRING } },
    cyberSecurity: { type: Type.ARRAY, items: { type: Type.STRING } },
    softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    industries: {
      type: Type.ARRAY,
      description: "Toimialat joista CV:ssä on kokemusta (esim. 'Fintech', 'SaaS').",
      items: { type: Type.STRING },
    },
    preferredLocations: {
      type: Type.ARRAY,
      description: "Maantieteelliset preferenssit jos CV:ssä mainittu.",
      items: { type: Type.STRING },
    },
    profileSummary: {
      type: Type.STRING,
      description: "2–3 lauseen yhteenveto profiilista suomeksi.",
    },
  },
};

export interface CvProfile {
  yearsOfExperience: number;
  seniority: "junior" | "mid" | "senior" | "lead" | "unclear";
  primaryRoles: string[];
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  devops: string[];
  dataScience: string[];
  cyberSecurity: string[];
  softSkills: string[];
  industries: string[];
  preferredLocations: string[];
  profileSummary: string;
}

export async function extractCvProfile(cv: string): Promise<CvProfile> {
  const client = getClient();

  const prompt = `Poimi alla olevasta CV:stä strukturoidut tiedot. Palauta JSON.

========= CV =========
${truncate(cv)}
========= LOPPU =========`;

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: [{ text: PROFILE_SYSTEM }],
      temperature: 0.2,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: PROFILE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Tyhjä vastaus Gemini-malilta");
  return JSON.parse(text) as CvProfile;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode 3 — Career fit synthesis. Takes the CV profile + live market data and
// returns ranked role recommendations backed by the real Koodaripula DB.
// ──────────────────────────────────────────────────────────────────────────────

const FIT_SYSTEM = `Olet suomalainen IT-alan urakonsultti. Saat käyttöösi hakijan profiilin ja Suomen IT-työmarkkinoiden reaaliaikaista dataa (aktiiviset työpaikkailmoitukset ja eniten kysytyt teknologiat). Tehtäväsi on suositella hakijalle 3–5 sopivinta roolia perustuen hänen osaamiseensa JA siihen mitä markkinoilla oikeasti kysytään.

Tärkeää:
- Suosittele vain rooleja joihin hakijan nykyisellä profiililla olisi realistisia mahdollisuuksia (tai 1 step up -asteroina).
- Viittaa tarkasti annettuun markkinadataan. Jos rooli ei esiinny datassa, älä suosittele sitä.
- Jokaiselle roolille 1–3 teknologiaa joita hakijalla JO ON (vahvuudet) ja 1–3 joita kannattaisi opetella (kasvukohteet).
- Kirjoita suomeksi, teknologianimet englanniksi.`;

const FIT_SCHEMA = {
  type: Type.OBJECT,
  required: ["verdict", "recommendations", "hotSkillsYouHave", "hotSkillsToLearn", "overallAdvice"],
  properties: {
    verdict: {
      type: Type.STRING,
      description: "1–2 lauseen kokonaisarvio hakijan markkinatilanteesta Suomessa.",
    },
    recommendations: {
      type: Type.ARRAY,
      description: "3–5 suositeltua roolia, parhaasta alkaen.",
      items: {
        type: Type.OBJECT,
        required: ["role", "fitScore", "jobsInMarket", "reasoning", "youAlreadyHave", "shouldLearn"],
        properties: {
          role: { type: Type.STRING, description: "Rooli (esim. 'Full Stack Developer')." },
          fitScore: {
            type: Type.INTEGER,
            description: "0–100. Kuinka hyvin hakijan profiili osuu tähän rooliin.",
          },
          jobsInMarket: {
            type: Type.INTEGER,
            description: "Avointen paikkojen määrä Suomessa annetun datan mukaan. 0 jos ei selvää lukua.",
          },
          reasoning: {
            type: Type.STRING,
            description: "1–2 lausetta miksi tämä rooli sopii.",
          },
          youAlreadyHave: {
            type: Type.ARRAY,
            description: "1–3 teknologiaa/osaamisaluetta joilla hakija on vahva tähän rooliin.",
            items: { type: Type.STRING },
          },
          shouldLearn: {
            type: Type.ARRAY,
            description: "1–3 teknologiaa joita kannattaisi opetella parantaakseen sopivuutta.",
            items: { type: Type.STRING },
          },
        },
      },
    },
    hotSkillsYouHave: {
      type: Type.ARRAY,
      description: "Hakijan osaamiset jotka ovat tällä hetkellä markkinoiden kysytyimpien joukossa.",
      items: { type: Type.STRING },
    },
    hotSkillsToLearn: {
      type: Type.ARRAY,
      description: "Kysytyt teknologiat joita hakijalla ei ole. Korkeintaan 5.",
      items: { type: Type.STRING },
    },
    overallAdvice: {
      type: Type.STRING,
      description: "2–3 lauseen strateginen neuvo seuraavasta askeleesta urallaan.",
    },
  },
};

export interface CareerRecommendation {
  role: string;
  fitScore: number;
  jobsInMarket: number;
  reasoning: string;
  youAlreadyHave: string[];
  shouldLearn: string[];
}

export interface CareerFitResult {
  verdict: string;
  recommendations: CareerRecommendation[];
  hotSkillsYouHave: string[];
  hotSkillsToLearn: string[];
  overallAdvice: string;
}

export interface MarketContext {
  totalActiveJobs: number;
  topRoles: { name: string; count: number }[];
  topLanguages: { name: string; count: number }[];
  topFrameworks: { name: string; count: number }[];
  topCloud: { name: string; count: number }[];
  topDatabases: { name: string; count: number }[];
}

export async function matchCareerFit(
  profile: CvProfile,
  market: MarketContext,
): Promise<CareerFitResult> {
  const client = getClient();

  const marketSummary = `Suomen IT-työmarkkinoiden reaaliaikainen data (aktiiviset avoimet paikat Koodaripulan tietokannassa):

Avoimia paikkoja yhteensä: ${market.totalActiveJobs}

Kysytyimmät roolit (rooli — avointen paikkojen määrä):
${market.topRoles.map((r) => `- ${r.name}: ${r.count}`).join("\n")}

Kysytyimmät ohjelmointikielet:
${market.topLanguages.map((r) => `- ${r.name}: ${r.count}`).join("\n")}

Kysytyimmät sovelluskehykset:
${market.topFrameworks.map((r) => `- ${r.name}: ${r.count}`).join("\n")}

Kysytyimmät pilvipalvelut:
${market.topCloud.map((r) => `- ${r.name}: ${r.count}`).join("\n")}

Kysytyimmät tietokannat:
${market.topDatabases.map((r) => `- ${r.name}: ${r.count}`).join("\n")}`;

  const profileSummary = `Hakijan profiili:
- Kokemusta: ${profile.yearsOfExperience} vuotta (${profile.seniority})
- Pääroolit: ${profile.primaryRoles.join(", ") || "ei selvää"}
- Kielet: ${profile.languages.join(", ") || "—"}
- Sovelluskehykset: ${profile.frameworks.join(", ") || "—"}
- Tietokannat: ${profile.databases.join(", ") || "—"}
- Pilvi: ${profile.cloud.join(", ") || "—"}
- DevOps: ${profile.devops.join(", ") || "—"}
- Data/AI: ${profile.dataScience.join(", ") || "—"}
- Tietoturva: ${profile.cyberSecurity.join(", ") || "—"}
- Toimialat: ${profile.industries.join(", ") || "—"}
- Sijainnit: ${profile.preferredLocations.join(", ") || "—"}
- Yhteenveto: ${profile.profileSummary}`;

  const prompt = `${marketSummary}\n\n${profileSummary}\n\nYhdistä tiedot ja palauta JSON suositukset.`;

  const response = await client.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: [{ text: FIT_SYSTEM }],
      temperature: 0.4,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: FIT_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Tyhjä vastaus Gemini-malilta");
  const parsed = JSON.parse(text) as CareerFitResult;
  for (const rec of parsed.recommendations) {
    rec.fitScore = Math.max(0, Math.min(100, rec.fitScore ?? 0));
  }
  return parsed;
}
