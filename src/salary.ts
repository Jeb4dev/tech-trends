// Shared salary extraction utility
// Returns formatted label or null. Implements same logic as in openings.tsx.
// Placeholder '€' when salary tokens present but no numeric figures parsed.

export interface ExtractedSalary {
  label: string; // e.g. 3000–4000€, 4200€+, 2141€, 1300€ + bonus, €
  min?: number;  // parsed monthly lower bound if numeric
  max?: number;  // parsed monthly upper bound if numeric range
}

function normalizeDisplay(raw: string): string {
  let s = raw.trim();
  s = s.replace(/ /g, '');
  s = s.replace(/\.(?=\d{3}(?:\D|$))/g, '');
  if (/\.\d{1,2}$/.test(s)) s = s.replace(/\.(\d{1,2})$/, ',$1');
  return s;
}
function toNumber(raw: string): number | null {
  let s = raw.replace(/ /g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(/,(?=\d{1,2}$)/, '.');
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
const plausible = (n: number | null) => n !== null && n >= 400 && n <= 30000;

export function extractSalaryRaw(text: string): ExtractedSalary | null {
  if (!text) return null;
  const cleaned = text.replace(/[\u2013\u2014]/g, '-').replace(/€/g, '€');
  const lowered = cleaned.toLowerCase();
  const lines = cleaned.split(/\n+/).filter(Boolean);
  const currencyToken = /(€|e\/kk|euroa?|eur|per month|\/month|monthly|kuukausi|kuukausipalkka|palkka|salary)/i;
  const salaryLines = lines.filter(l => currencyToken.test(l.toLowerCase()));

  const numberCore = '(?:\\d{1,3}(?:[ .]\\d{3})+|\\d+)(?:[.,]\\d{1,2})?';
  const numberWithCur = `(?:€\\s*)?(${numberCore})(?:\\s*(?:€|e|eur|euroa))?`;
  const monthlyQualifier = '(?:/\\s*kk|e/kk|/month|per\\s+month|month|monthly|kuukausi|kuukausipalkka|kuukausipalkka|kuukausittain|kk|kuukaudessa)';
  const rangePattern = new RegExp(`${numberWithCur}\\s*[–-]\\s*${numberWithCur}(?:\\s*(?:€|e|eur|euroa))?(?:\\s*${monthlyQualifier})?`, 'i');
  const singlePattern = new RegExp(`${numberWithCur}(?:\\s*(?:€|e|eur|euroa))?(?:\\s*${monthlyQualifier})`, 'i');
  const looseRangeRegex = new RegExp(`${numberWithCur}\\s*[–-]\\s*${numberWithCur}`, 'i');
  const singleLooseNumber = new RegExp(numberWithCur, 'i');

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
      const tail = line.slice(m.index + m[0].length, m.index + m[0].length + 60).toLowerCase();
      if (/(ylöspäin|alkaen|lähtien|from|starting)/.test(tail)) return { label: `${base}€+`, min: n! };
      if (/\+\s*\d{2,5}\s*[–-]\s*\d{2,5}\s*€.*(bonus|tulos|tulospalkkio)/i.test(line)) return { label: `${base}€ + bonus`, min: n! };
      return { label: `${base}€`, min: n! };
    }
  }
  // Pass 4: single number plain context
  for (const line of salaryLines) {
    if (/(kuukausipalkka|monthly salary|palkka|salary)/i.test(line)) {
      const sl = singleLooseNumber.exec(line);
      if (sl) {
        const n = toNumber(sl[1]);
        if (!plausible(n)) continue;
        return { label: `${normalizeDisplay(sl[1])}€`, min: n! };
      }
    }
  }
  if (/(€|\beuroa?\b|e\/kk|per month|monthly)/i.test(lowered)) return { label: '€' };
  return null;
}
