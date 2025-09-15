import { Category, Data, Results } from "@/types";
import { languages, frameworks, databases, cloud, devops, dataScience, cyberSecurity, softSkills, positions, seniority, location } from "@/keywords";
import { classifyWorkMode } from "@/workMode";
import { extractSalaryRaw } from "@/salary";

const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matchAll(
  results: Results[],
  keywords: (string | string[])[],
  complicated: boolean = false,
  slice: number = 50,
  title = false
): Category[] {
  return keywords
    .map((keyword) => {
      const list = Array.isArray(keyword) ? keyword : [keyword];
      const positives = list.filter(k => !k.startsWith("!"));
      if (positives.length === 0) return null; // skip if only negatives
      const escapedKeywords = positives.map(escapeRegExp);
      const regexString = escapedKeywords.join("|");
      const negativesLower: string[] = list
        .filter((kw) => kw.startsWith("!"))
        .map((kw) => kw.replace("!", "").toLowerCase());

      const regex = complicated
        ? new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "i")
        : new RegExp(`\\b(?:${regexString})`, "i");

      const matched: Results[] = [];
      for (let i = 0; i < results.length; i++) {
        const opening = results[i];
        const text = title ? (opening._headingLower || (opening._headingLower = opening.heading.toLowerCase())) : (opening._descrLower || (opening._descrLower = opening.descr.toLowerCase()));
        if (negativesLower.length && negativesLower.some(neg => text.includes(neg))) continue;
        if (regex.test(text)) matched.push(opening);
      }

      if (!matched.length) return null;

      return { label: positives[0], active: false, openings: matched, filteredOpenings: [] } as Category;
    })
    .filter((c): c is Category => !!c)
    .sort((a, b) => b.openings.length - a.openings.length)
    .slice(0, slice);
}

function groupResultsByProperty(results: Results[], property: keyof Results): Category[] {
  const categories: Category[] = [];
  results.forEach((result) => {
    if (!result[property]) return;
    const existing = categories.find((c) => c.label === result[property]);
    if (existing) existing.openings.push(result); else categories.push({ label: result[property] as string, active: false, openings: [result], filteredOpenings: [] });
  });
  return categories.sort((a, b) => b.openings.length - a.openings.length).filter(c => c.label);
}

function classifySeniority(openings: Results[]): Category[] {
  const order = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Director", "Vice President", "Chief"];
  const groups = seniority.map((g) => {
    const arr = Array.isArray(g) ? g : [g];
    const [label, ...syns] = arr;
    return {
      label,
      synonyms: [label, ...syns].filter((s) => !s.startsWith("!")).map((s) => s.toLowerCase()),
      negatives: [label, ...syns].filter((s) => s.startsWith("!")).map((s) => s.slice(1).toLowerCase()),
    };
  });

  const highLevel = new Set(["Lead", "Director", "Vice President", "Chief"]);
  const ambiguousHigh = new Set(["lead", "head", "principal", "staff", "architect"]);
  const roleAfterAmbiguous = /(lead|head|principal|staff|architect)\s+(engineer|developer|designer|artist|programmer|researcher|analyst|manager|product|security|game|data|ui|ux)/i;
  const teamLeadPattern = /(team|technical|tech)\s+lead/i;
  const mentoringJuniorRegex = /(mentor(ing)?|coach(ing)?|guide(ing)?|support(ing)?|train(ing)?)\s+(our\s+)?junior(s)?/i;
  const contextualHighLevelPhrase = /(report(s|ing)?\s+to|support(ing)?|assist(ing)?|work(ing)?\s+with|collaborat(e|ing)\s+with)/i;
  const contactSectionRegex = /(lisätietoja|yhteyshenkilö|contact|ota\s+yhteyttä|rekrytoija|rekrytointipäällikkö)/i;

  const resultsMap: Record<string, Category> = {};
  groups.forEach((g) => { resultsMap[g.label] = { label: g.label, active: false, openings: [], filteredOpenings: [] }; });

  openings.forEach((opening) => {
    const title = opening._headingLower || (opening._headingLower = opening.heading.toLowerCase());
    const desc = opening._descrLower || (opening._descrLower = opening.descr.toLowerCase());
    const full = title + "\n" + desc;
    const scores: Record<string, number> = {};
    const meta: Record<string, { titleHits: number; descHits: number; descStrong: number }> = {};

    groups.forEach((g) => {
      if (g.negatives.some((n) => full.includes(n))) return;
      let titleHits = 0; let descHits = 0; let strongDesc = 0; let subtotal = 0;
      g.synonyms.forEach((rawSyn) => {
        const syn = rawSyn.toLowerCase();
        const safe = syn.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const rWord = new RegExp(`\\b${safe}\\b`, "gi");
        const t = title.match(rWord);
        if (t) { titleHits += t.length; subtotal += 10 * t.length; }
        rWord.lastIndex = 0;
        const d = desc.match(rWord);
        if (d) {
          if (ambiguousHigh.has(syn) && !title.match(rWord)) {
            let valid = false;
            if (roleAfterAmbiguous.test(desc) || teamLeadPattern.test(desc)) valid = true;
            if (!valid) return;
            strongDesc += d.length;
          }
          descHits += d.length; subtotal += 2 * d.length;
        }
      });
      if (subtotal > 0) { scores[g.label] = (scores[g.label] || 0) + subtotal; meta[g.label] = { titleHits, descHits, descStrong: strongDesc }; }
    });

    const yearsMatch = desc.match(/\b(\d{1,2})\+?\s*(?:years|yrs|vuotta|v)\b/);
    let years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
    if (years !== null) {
      if (years >= 10) scores["Senior"] = (scores["Senior"] || 0) + 4;
      else if (years >= 6) scores["Senior"] = (scores["Senior"] || 0) + 2;
      else if (years <= 2) scores["Junior"] = (scores["Junior"] || 0) + 2;
    }

    if (!Object.values(meta).some((m) => m.titleHits > 0)) scores["Mid-level"] = (scores["Mid-level"] || 0) + 2;
    if (mentoringJuniorRegex.test(full) && scores["Junior"]) scores["Junior"] -= 6;
    highLevel.forEach((hl) => {
      if (scores[hl] && (!meta[hl] || meta[hl].titleHits === 0)) {
        const idx = desc.indexOf(hl.toLowerCase());
        if (idx > -1) {
          const window = desc.slice(Math.max(0, idx - 50), idx + 50);
          if (contextualHighLevelPhrase.test(window)) delete scores[hl];
        }
      }
    });

    if (scores["Chief"]) {
      const chiefMeta = meta["Chief"];
      if (!chiefMeta || chiefMeta.titleHits === 0) {
        const chiefRegex = /(toimitusjohtaja|verkställande\s+direktör|chief|c-level|cio|ciso|teknologiajohtaja|tiedonhallintajohtaja|tietoturvajohtaja)/gi;
        const matches: number[] = []; let _m: RegExpExecArray | null;
        while ((_m = chiefRegex.exec(desc)) !== null) { matches.push(_m.index); if (_m.index === chiefRegex.lastIndex) chiefRegex.lastIndex++; }
        const contactStart = desc.search(contactSectionRegex);
        let allInContact = contactStart >= 0 && matches.length > 0 && matches.every((i) => i >= contactStart);
        let contextualCount = 0;
        for (const idx of matches) { const w = desc.slice(Math.max(0, idx - 60), idx + 60); if (contextualHighLevelPhrase.test(w)) contextualCount++; }
        if (allInContact || contextualCount === matches.length) delete scores["Chief"]; else if (matches.length === 1 && !years) { if (scores["Chief"] <= 2) delete scores["Chief"]; else scores["Chief"] -= 3; }
      }
    }

    if (scores["Senior"] && meta["Senior"] && meta["Senior"].titleHits === 0 && meta["Senior"].descStrong === 0 && (!years || years < 6)) {
      scores["Mid-level"] = (scores["Mid-level"] || 0) + 1; delete scores["Senior"]; }

    if (scores["Lead"] && meta["Lead"] && meta["Lead"].titleHits === 0 && meta["Lead"].descStrong === 0) {
      if (scores["Senior"]) delete scores["Lead"]; else { scores["Mid-level"] = (scores["Mid-level"] || 0) + 1; delete scores["Lead"]; }
    }

    if (!Object.entries(scores).some(([, v]) => v > 0)) scores["Mid-level"] = 1;

    const best = Object.entries(scores)
      .filter(([, v]) => v > 0)
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : order.indexOf(b[0]) - order.indexOf(a[0])))[0];
    if (best) { if (!resultsMap[best[0]]) resultsMap[best[0]] = { label: best[0], active: false, openings: [], filteredOpenings: [] }; resultsMap[best[0]].openings.push(opening); }
  });

  return Object.values(resultsMap).filter((c) => c.openings.length).sort((a, b) => b.openings.length - a.openings.length);
}

export function buildBaseCategories(results: Results[]) {
  if (!results || results.length === 0) {
    return {
      categories: {
        languages: [], frameworks: [], databases: [], cloud: [], devops: [], dataScience: [], cyberSecurity: [], softSkills: [], positions: [], seniority: [], workMode: [], cities: [], salary: []
      } as Data,
      companies: [] as Category[],
      locations: [] as Category[],
    };
  }
  // Pre-cache lowercase
  results.forEach(r => { if (!r._headingLower) r._headingLower = r.heading.toLowerCase(); if (!r._descrLower) r._descrLower = r.descr.toLowerCase(); });

  const lowerCache = new Map<Results, string>();
  const getFull = (o: Results) => { if (!lowerCache.has(o)) lowerCache.set(o, (o.heading + "\n" + o.descr).toLowerCase()); return lowerCache.get(o)!; };
  const cityCategories: Category[] = location.map(city => {
    const variants = Array.isArray(city) ? city : [city];
    const lowerVariants = variants.map(v => v.toLowerCase());
    const pattern = lowerVariants.map(escapeRegExp).join("|");
    const regex = new RegExp(`\\b(?:${pattern})\\b`, 'i');
    const openings = results.filter(o => {
      const full = getFull(o);
      if (regex.test(full)) return true;
      const loc = o.municipality_name ? o.municipality_name.toLowerCase() : '';
      return !!loc && lowerVariants.includes(loc);
    });
    return { label: variants[0], active: false, openings, filteredOpenings: [] } as Category;
  }).filter(c => c.openings.length > 0).sort((a,b)=> b.openings.length - a.openings.length);

  const categories: Data = {
    languages: matchAll(results, languages, true),
    frameworks: matchAll(results, frameworks, true),
    databases: matchAll(results, databases, true),
    cloud: matchAll(results, cloud, true),
    devops: matchAll(results, devops, true),
    dataScience: matchAll(results, dataScience, true),
    softSkills: matchAll(results, softSkills, false),
    cyberSecurity: matchAll(results, cyberSecurity, true),
    positions: matchAll(results, positions, false),
    seniority: classifySeniority(results),
    workMode: classifyWorkMode(results),
    cities: cityCategories,
    salary: [],
  };

  // Salary
  const salaryRanges = [
    { label: "0-2000", min: 0, max: 1999 },
    { label: "2000-3000", min: 2000, max: 2999 },
    { label: "3000-4000", min: 3000, max: 3999 },
    { label: "4000-5000", min: 4000, max: 4999 },
    { label: "5000-6000", min: 5000, max: 5999 },
    { label: "6000-7000", min: 6000, max: 6999 },
    { label: "7000-8000", min: 7000, max: 7999 },
    { label: "8000+", min: 8000, max: Infinity },
  ];
  const salaryIncluded: Results[] = [];
  const rangeBuckets: Record<string, Results[]> = Object.fromEntries(salaryRanges.map(r => [r.label, []]));
  results.forEach(o => {
    const sal = extractSalaryRaw(o.heading + "\n" + o.descr);
    if (!sal) return;
    salaryIncluded.push(o);
    if (sal.min != null) {
      const minVal = sal.min; const maxVal = sal.max ?? sal.min;
      salaryRanges.forEach(r => { if (maxVal >= r.min && minVal < r.max) { rangeBuckets[r.label].push(o); } });
    }
  });
  const salaryCategories: Category[] = [];
  if (salaryIncluded.length) salaryCategories.push({ label: "Salary Included", active: false, openings: salaryIncluded, filteredOpenings: [] });
  salaryRanges.forEach(r => { const arr = rangeBuckets[r.label]; if (arr.length) salaryCategories.push({ label: r.label, active: false, openings: arr, filteredOpenings: [] }); });
  categories.salary = salaryCategories;

  const locations = groupResultsByProperty(results, "municipality_name");
  const companies = groupResultsByProperty(results, "company_name");
  return { categories, companies, locations };
}

