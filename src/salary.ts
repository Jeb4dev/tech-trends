// Shared salary extraction utility
// Returns formatted label or null. Implements same logic as in openings.tsx.
// Placeholder '€' when salary tokens present but no numeric figures parsed.

export interface ExtractedSalary {
  label: string; // e.g. 3000–4000€, 4200€+, 2141€, 1300€ + bonus, €
  min?: number; // parsed monthly lower bound if numeric
  max?: number; // parsed monthly upper bound if numeric range
}

function normalizeDisplay(raw: string): string {
  let s = raw.trim();
  // Handle "k" notation - convert to full number
  if (/^\d+(?:\.\d+)?k$/i.test(s)) {
    const num = parseFloat(s.replace(/k$/i, ""));
    return isNaN(num) ? s : String(num * 1000);
  }
  s = s.replace(/ /g, "");
  // Remove dots used as thousand separators (dot followed by exactly 3 digits)
  s = s.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  // Remove commas used as thousand separators (comma followed by exactly 3 digits)
  s = s.replace(/,(?=\d{3}(?:\D|$))/g, "");
  // Convert comma decimal to dot decimal for display
  s = s.replace(/,(\d{1,2})$/, ".$1");
  return s;
}
function toNumber(raw: string): number | null {
  let s = raw.trim();
  // Handle "k" notation (e.g., "4k" -> 4000, "4.5k" -> 4500)
  if (/^\d+(?:\.\d+)?k$/i.test(s)) {
    const num = parseFloat(s.replace(/k$/i, ""));
    return isNaN(num) ? null : num * 1000;
  }
  s = s
    .replace(/ /g, "")
    // Remove dots used as thousand separators (dot followed by exactly 3 digits)
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    // Remove commas used as thousand separators (comma followed by exactly 3 digits)
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    // Convert comma decimal to dot decimal
    .replace(/,(?=\d{1,2}$)/, ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
const plausible = (n: number | null) => n !== null && n >= 400 && n <= 30000;

export function extractSalaryRaw(text: string): ExtractedSalary | null {
  if (!text) return null;
  const cleaned = text.replace(/[\u2013\u2014]/g, "-").replace(/€/g, "€");
  const lowered = cleaned.toLowerCase();
  const lines = cleaned.split(/\n+/).filter(Boolean);
  const currencyToken =
    /(€|e\/kk|euroa?\b|\beur\b|per month|\/month|monthly|kuukausipalkka|salary|lön|månadslön|pay\b|gross\s+salary|base\s+pay)/i;
  // Patterns to exclude: company stats, budgets, revenue, yearly amounts, large scale numbers
  // Be more specific with "annual" to not exclude "annual bonus" mentions
  const excludePattern =
    /(miljardia?|miljoner|million|billion|miljoonaa?|budget|revenue|liikevaihto|omsättning|yearly|vuodessa|vuosittain|per år|årlig|\/year|\/vuosi|työntekijä|anställd|employee|liiketoimintayksikk|investoint|omaisuud|sertifikaatt|referr|per\s+hour|\/\s*h\b|tunti|hourly|iso\s?\d+|standardi?|vaatimus|vaatimukset)/i; // Pattern for annual + amount (not annual bonus)
  const annualAmountPattern = /annual\s+(?:salary|revenue|budget|income|turnover)/i;
  // Scale words that indicate non-salary amounts
  const scalePattern = /\b\d+[.,]?\d*\s*(miljardia?|miljoner|million|billion|miljoonaa?)\b/i;
  // Hourly wage patterns
  const hourlyPattern = /\b\d+\s*[-–]?\s*\d*\s*(€|eur|euro)\s*(\/\s*h|per\s+hour|tunti)/i;
  // One-time bonus/benefit patterns (not recurring salary)
  const oneTimePattern = /(sertifikaatt|referr|hankkimis|equipment|käytettäväksi|epassi|flex)/i;

  const salaryLines = lines.filter((l) => {
    const low = l.toLowerCase();
    if (!currencyToken.test(low)) return false;
    // Exclude lines with budget/revenue/yearly context
    if (excludePattern.test(low)) return false;
    if (/\biso\s?(\d{4,5})\b/i.test(low)) return false;
    // Exclude lines with "annual salary/revenue/budget" pattern
    if (annualAmountPattern.test(low)) return false;
    // Exclude lines with scale numbers (millions, billions)
    if (scalePattern.test(l)) return false;
    // Exclude hourly wages
    if (hourlyPattern.test(l)) return false;
    // Exclude one-time bonuses/benefits
    if (oneTimePattern.test(low)) return false;
    return true;
  });

  // Number patterns: support space, dot, or comma as thousand separators
  // Also support "k" notation (4k = 4000)
  const numberCore = "(?:\\d{1,3}(?:[ .,]\\d{3})+|\\d+)(?:[.,]\\d{1,2})?";
  const kNotation = "\\d+(?:\\.\\d+)?k";
  const numberOrK = `(?:${kNotation}|${numberCore})`;
  const currencyAfter = "(?:\\s*(?:€|e\\b|eur\\b|euroa?\\b|euros?\\b))?";
  const numberWithCur = `(?:€\\s*)?(${numberOrK})${currencyAfter}`;
  const monthlyQualifier =
    "(?:/\\s*kk|e/kk|/month|per\\s+month|month|monthly|kuukausi|kuukausipalkka|kuukausipalkka|kuukausittain|kk|kuukaudessa)";
  // Range with currency after second number (e.g., "4300 - 6400 EUR")
  const rangePattern = new RegExp(
    `${numberWithCur}\\s*[–-]\\s*${numberWithCur}(?:\\s*(?:€|e\\b|eur\\b|euroa?\\b|euros?\\b))?(?:\\s*${monthlyQualifier})?`,
    "i",
  );
  // Range in salary context line (e.g., "Monthly salary range ... 4300 - 6400 EUR")
  const contextRangePattern = new RegExp(
    `(${numberOrK})\\s*[–-]\\s*(${numberOrK})\\s*(?:€|eur\\b|euroa?\\b|euros?\\b)`,
    "i",
  );
  // Word-based range patterns: "between X and Y", "X to Y", "X eurosta Y euroon"
  const betweenPattern = new RegExp(
    `between\\s+(${numberOrK})\\s+and\\s+(${numberOrK})\\s*(?:€|eur\\b|euroa?\\b|euros?\\b)`,
    "i",
  );
  const toPattern = new RegExp(`(${numberOrK})\\s+to\\s+(${numberOrK})\\s*(?:€|eur\\b|euroa?\\b|euros?\\b)`, "i");
  const finnishFromToPattern = new RegExp(`(${numberCore})\\s*eurosta\\s+(${numberCore})\\s*euroon`, "i");
  const singlePattern = new RegExp(
    `${numberWithCur}(?:\\s*(?:€|e\\b|eur\\b|euroa?\\b|euros?\\b))?(?:\\s*${monthlyQualifier})`,
    "i",
  );
  const looseRangeRegex = new RegExp(`${numberWithCur}\\s*[–-]\\s*${numberWithCur}`, "i");
  const singleLooseNumber = new RegExp(numberWithCur, "i");
  // Pattern for "starting from X €" or "from X €" style (qualifier before number)
  // Also handles Finnish "alkaen X€/kk" format
  const startingFromPattern = new RegExp(
    `(?:starting\\s+from|from|alkaen|lähtien)\\s+(${numberCore})\\s*(?:€|e\\b|eur\\b|euroa\\b|e/kk|€/kk)`,
    "i",
  );
  // Pattern for interrupted text like "5 502,36 (vaatitaso 13) euroa/kk"
  const interruptedPattern = new RegExp(`(${numberCore})\\s*\\([^)]+\\)\\s*(?:euroa?|eur)(?:/kk|/kuukausi)?`, "i");

  // Pass 0.5: Check for base salary + bonus/provision pattern
  // Must check before range detection to avoid picking up the bonus range
  const basePlusBonusPattern = new RegExp(
    `(${numberCore})\\s*€\\s*\\+\\s*(?:${numberCore}\\s*[–-]\\s*${numberCore}\\s*€.*)?(?:bonus|tulos|tulospalkkio|provision|provisio)`,
    "i",
  );
  // Also match "pohjapalkka X € + provisio" pattern
  const baseSalaryProvisionPattern = new RegExp(
    `(?:pohjapalkka|peruspalkka|base\\s*(?:salary|pay))\\s+(${numberCore})\\s*€`,
    "i",
  );
  for (const line of salaryLines) {
    // Check for provision/bonus pattern first
    if (/provisio|provision|bonus/i.test(line)) {
      const bsp = baseSalaryProvisionPattern.exec(line);
      if (bsp) {
        const n = toNumber(bsp[1]);
        if (plausible(n)) {
          return { label: `${normalizeDisplay(bsp[1])}€ + bonus`, min: n! };
        }
      }
    }
    const bm = basePlusBonusPattern.exec(line);
    if (bm) {
      const n = toNumber(bm[1]);
      if (!plausible(n)) continue;
      return { label: `${normalizeDisplay(bm[1])}€ + bonus`, min: n! };
    }
  }

  // Pass 0.75: Word-based range patterns ("between X and Y", "X to Y", "X eurosta Y euroon")
  for (const line of salaryLines) {
    // "between X and Y euros"
    const bm = betweenPattern.exec(line);
    if (bm) {
      const n1 = toNumber(bm[1]);
      const n2 = toNumber(bm[2]);
      if (plausible(n1) && plausible(n2)) {
        const first = n1! <= n2! ? n1! : n2!;
        const second = n1! <= n2! ? n2! : n1!;
        return { label: `${normalizeDisplay(bm[1])}–${normalizeDisplay(bm[2])}€`, min: first, max: second };
      }
    }
    // "X to Y €"
    const tm = toPattern.exec(line);
    if (tm) {
      const n1 = toNumber(tm[1]);
      const n2 = toNumber(tm[2]);
      if (plausible(n1) && plausible(n2)) {
        const first = n1! <= n2! ? n1! : n2!;
        const second = n1! <= n2! ? n2! : n1!;
        return { label: `${normalizeDisplay(tm[1])}–${normalizeDisplay(tm[2])}€`, min: first, max: second };
      }
    }
    // "X eurosta Y euroon"
    const fm = finnishFromToPattern.exec(line);
    if (fm) {
      const n1 = toNumber(fm[1]);
      const n2 = toNumber(fm[2]);
      if (plausible(n1) && plausible(n2)) {
        const first = n1! <= n2! ? n1! : n2!;
        const second = n1! <= n2! ? n2! : n1!;
        return { label: `${normalizeDisplay(fm[1])}–${normalizeDisplay(fm[2])}€`, min: first, max: second };
      }
    }
  }

  // Pass 1: explicit range
  for (const line of salaryLines) {
    const m = rangePattern.exec(line);
    if (m) {
      const n1 = toNumber(m[1]);
      const n2 = toNumber(m[2]);
      if (!plausible(n1) || !plausible(n2)) continue;
      const first = n1! <= n2! ? n1! : n2!;
      const second = n1! <= n2! ? n2! : n1!;
      return { label: `${normalizeDisplay(m[1])}–${normalizeDisplay(m[2])}€`, min: first, max: second };
    }
    // Also try context-based range (e.g., "Monthly salary range ... 4300 - 6400 EUR")
    const cm = contextRangePattern.exec(line);
    if (cm) {
      const n1 = toNumber(cm[1]);
      const n2 = toNumber(cm[2]);
      if (!plausible(n1) || !plausible(n2)) continue;
      const first = n1! <= n2! ? n1! : n2!;
      const second = n1! <= n2! ? n2! : n1!;
      return { label: `${normalizeDisplay(cm[1])}–${normalizeDisplay(cm[2])}€`, min: first, max: second };
    }
  }
  // Pass 2: context led loose range
  for (const line of salaryLines) {
    if (!/(salary|monthly|kuukausipalkka|palkka)/i.test(line)) continue;
    const lr = looseRangeRegex.exec(line);
    if (lr) {
      const n1 = toNumber(lr[1]);
      const n2 = toNumber(lr[2]);
      if (!plausible(n1) || !plausible(n2)) continue;
      const first = n1! <= n2! ? n1! : n2!;
      const second = n1! <= n2! ? n2! : n1!;
      return { label: `${normalizeDisplay(lr[1])}–${normalizeDisplay(lr[2])}€`, min: first, max: second };
    }
  }
  // Pass 3: single explicit figure
  for (const line of salaryLines) {
    const m = singlePattern.exec(line);
    if (m) {
      const n = toNumber(m[1]);
      if (!plausible(n)) continue;
      const base = normalizeDisplay(m[1]);
      // Check for "starting from" keywords before or after the number
      const head = line.slice(0, m.index).toLowerCase();
      const tail = line.slice(m.index + m[0].length, m.index + m[0].length + 60).toLowerCase();
      if (/(ylöspäin|alkaen|lähtien|from|starting)/.test(tail)) return { label: `${base}€+`, min: n! };
      if (/(alkaen|lähtien|starting\s+from|from)\s*$/.test(head)) return { label: `${base}€+`, min: n! };
      if (/\+\s*\d{2,5}\s*[–-]\s*\d{2,5}\s*€.*(bonus|tulos|tulospalkkio)/i.test(line))
        return { label: `${base}€ + bonus`, min: n! };
      return { label: `${base}€`, min: n! };
    }
  }
  // Pass 3.5: "starting from X €" or "from X €" style (qualifier before number)
  for (const line of salaryLines) {
    const sfm = startingFromPattern.exec(line);
    if (sfm) {
      const n = toNumber(sfm[1]);
      if (!plausible(n)) continue;
      return { label: `${normalizeDisplay(sfm[1])}€+`, min: n! };
    }
  }
  // Pass 3.75: Interrupted text pattern like "5 502,36 (vaatitaso 13) euroa/kk"
  for (const line of salaryLines) {
    const im = interruptedPattern.exec(line);
    if (im) {
      const n = toNumber(im[1]);
      if (!plausible(n)) continue;
      return { label: `${normalizeDisplay(im[1])}€`, min: n! };
    }
  }
  // Pass 4: single number plain context
  for (const line of salaryLines) {
    if (
      /(kuukausipalkka|monthly salary|palkka|salary|lön|månadslön|pay\b|tehtäväkohtainen|palkanosa|tasopalkka|peruspalkka|gross)/i.test(
        line,
      )
    ) {
      const sl = singleLooseNumber.exec(line);
      if (sl) {
        const n = toNumber(sl[1]);
        if (!plausible(n)) continue;
        return { label: `${normalizeDisplay(sl[1])}€`, min: n! };
      }
    }
  }
  // Only show € placeholder if there's explicit salary context with numeric hints (not just any euro mention)
  // Require actual numeric content or specific formatting that indicates a salary value exists
  const salaryContextPattern = /(kuukausipalkka|monthly salary|e\/kk|\/month|per month)/i;
  const salaryWithNumberPattern = /(palkka|salary)\s*[:=]\s*\d/i;
  if (salaryContextPattern.test(lowered) || salaryWithNumberPattern.test(lowered)) return { label: "€" };
  return null;
}
