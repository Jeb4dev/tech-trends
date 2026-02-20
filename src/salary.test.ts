import { extractSalaryRaw, ExtractedSalary } from "./salary";

interface TestCase {
  input: string;
  expected: ExtractedSalary | null;
  description?: string;
}

// ============================================================================
// 1. STANDARD RANGES (Perusmuotoiset palkkahaarukat)
// ============================================================================
const rangeCases: TestCase[] = [
  {
    input: "Monthly salary range for this position - 4300 - 6400 EUR (gross) + annual performance/sales bonuses.",
    expected: { label: "4300–6400€", min: 4300, max: 6400 },
    description: "Range with EUR and annual bonus mention",
  },
  {
    input: "Palkka 3000-4000€/kk",
    expected: { label: "3000–4000€", min: 3000, max: 4000 },
    description: "Finnish salary range with €/kk",
  },
  {
    input: "Salary: 2500 - 3500 € per month",
    expected: { label: "2500–3500€", min: 2500, max: 3500 },
    description: "Range with € per month",
  },
  {
    input: "We offer 4000–5000 EUR monthly",
    expected: { label: "4000–5000€", min: 4000, max: 5000 },
    description: "Range with en-dash and EUR monthly",
  },
  {
    input: "Kuukausipalkka 3 500 - 4 500 euroa",
    expected: { label: "3500–4500€", min: 3500, max: 4500 },
    description: "Finnish with space-separated thousands",
  },
  {
    input: "Salary is between 3000 and 4000 euros",
    expected: { label: "3000–4000€", min: 3000, max: 4000 },
    description: "Range defined by 'between X and Y'",
  },
  {
    input: "Salary 3000 to 4500 €",
    expected: { label: "3000–4500€", min: 3000, max: 4500 },
    description: "Range defined by 'to'",
  },
  {
    input: "Palkkaus tehtävässä sijoittuu välille 5 500–6 500 € osaamisesi ja kokemuksesi laajuuden mukaan.",
    expected: { label: "5500–6500€", min: 5500, max: 6500 },
    description: "Real data (2NS): 'välille X-Y €' with space separated thousands",
  },
  {
    input: "Palkka tehtävässä asettuu 4500-6000 €/kk välille osaamisesi ja kokemuksesi perusteella.",
    expected: { label: "4500–6000€", min: 4500, max: 6000 },
    description: "Real data (Fulvisol): 'asettuu X-Y €/kk välille'",
  },
  {
    input: "The role offers a competitive salary in the range of approximately 5500-6500 euros per month.",
    expected: { label: "5500–6500€", min: 5500, max: 6500 },
    description: "Real data (Vaisala): English text 'range of approximately'",
  },
  {
    input: "Palkka vastaavissa tehtävissä on tyypillisesti 5400 - 5800 €/kk.",
    expected: { label: "5400–5800€", min: 5400, max: 5800 },
    description: "Real data (Oulu Uni): 'tyypillisesti X - Y €/kk'",
  },
  {
    input: "alustava palkkaraami on 5000-6500€.",
    expected: { label: "5000–6500€", min: 5000, max: 6500 },
    description: "Real data (Insta Advance): 'palkkaraami' keyword",
  },
  {
    input: "palkkahaitari on 3500-4000€/kk.",
    expected: { label: "3500–4000€", min: 3500, max: 4000 },
    description: "Real data (Alina Hoivatiimi): 'palkkahaitari' keyword",
  },
  {
    input: "Olemme alustavasti hahmotelleet palkkahaarukan tähän rooliin liittyen 5 000 € – 6 500 € välille.",
    expected: { label: "5000–6500€", min: 5000, max: 6500 },
    description: "Real data (Ambientia): 'palkkahaarukan ... välille' with spaces",
  },
  {
    input: "Tavoiteansio: 3 000 € – 5 000 € / kk (kun vauhti on päällä).",
    expected: { label: "3000–5000€", min: 3000, max: 5000 },
    description: "Real data (Tecsync): 'Tavoiteansio'",
  },
];

// ============================================================================
// 2. SINGLE AMOUNTS (Yksittäiset summat)
// ============================================================================
const singleAmountCases: TestCase[] = [
  {
    input: "Monthly salary depends on your experience... starting from 4 500 €.",
    expected: { label: "4500€+", min: 4500 },
    description: "Starting from with space-separated number",
  },
  {
    input: "Palkka alkaen 3000€/kk",
    expected: { label: "3000€+", min: 3000 },
    description: "Finnish 'alkaen' (starting from)",
  },
  {
    input: "Salary: 4200€ per month",
    expected: { label: "4200€", min: 4200 },
    description: "Single salary with per month",
  },
  {
    input: "Kuukausipalkka 3500 euroa",
    expected: { label: "3500€", min: 3500 },
    description: "Finnish single salary",
  },
  {
    input: "We pay 5000 e/kk",
    expected: { label: "5000€", min: 5000 },
    description: "e/kk format",
  },
  {
    input: "Salary is around 3800 EUR",
    expected: { label: "3800€", min: 3800 },
    description: "Approximate salary",
  },
  {
    input: "n. 3200€ / kk",
    expected: { label: "3200€", min: 3200 },
    description: "Finnish abbreviation 'n.' (noin/approx)",
  },
  {
    input: "Tehtävän tasopalkka työsuhteen alkaessa on 4118,99 €/kk.",
    expected: { label: "4118.99€", min: 4118.99 },
    description: "Real data (Gradia): 'Tasopalkka' with precise decimal",
  },
  {
    input: "Palkka 3146,2 euroa/kk",
    expected: { label: "3146.2€", min: 3146.2 },
    description: "Real data (Helsinki): Comma as decimal separator",
  },
  {
    input: "Tehtävän vaativuustaso on 6-7... perusalkkaus... 3 841,13 euroa/kk tasolla 6",
    expected: { label: "3841.13€", min: 3841.13 },
    description: "Real data (Oulu Uni): Complex text with space thousand sep and comma decimal",
  },
  {
    input: "peruspalkka on 3.035,14 euroa/kuukausi.",
    expected: { label: "3035.14€", min: 3035.14 },
    description: "Real data (Poliisi): Dot thousand sep AND comma decimal sep mixed",
  },
  {
    input: "Tehtäväkohtainen palkka on 4 356,25 €/kk €/kk",
    expected: { label: "4356.25€", min: 4356.25 },
    description: "Real data (HUS): Typo in listing '€/kk' repeated",
  },
  {
    input: "tehtäväkohtainen palkanosa 4774,06 €/kk",
    expected: { label: "4774.06€", min: 4774.06 },
    description: "Real data (Supo): 'tehtäväkohtainen palkanosa'",
  },
  {
    input: "Tehtäväkohtainen palkka tehtävässä on 3828,71 €.",
    expected: { label: "3828.71€", min: 3828.71 },
    description: "Real data (Keski-Suomen hyvinvointialue): Specific decimal",
  },
  {
    input: "Tässä tehtävässä tehtäväkohtainen palkanosa on 5 502,36 (vaatitaso 13) euroa/kk",
    expected: { label: "5502.36€", min: 5502.36 },
    description: "Real data (Väylävirasto): Interrupted text '(vaatitaso 13)' between amount and unit",
  },
];

// ============================================================================
// 3. FORMATTING & PUNCTUATION (Muotoilu ja välimerkit)
// ============================================================================
const formattingCases: TestCase[] = [
  {
    input: "Salary 3.500 - 4.200 €",
    expected: { label: "3500–4200€", min: 3500, max: 4200 },
    description: "Dot as thousand separator",
  },
  {
    input: "Peruspalkka ja tehtäväkohtainen palkanosa ovat yhteensä noin 2.550€/kk.",
    expected: { label: "2550€", min: 2550 },
    description: "Real data (SAMK): Dot as thousand separator in single amount",
  },
  {
    input: "Salary 3,500 - 4,200 €",
    expected: { label: "3500–4200€", min: 3500, max: 4200 },
    description: "Comma as thousand separator",
  },
  {
    input: "Salary range 3000-4000€",
    expected: { label: "3000–4000€", min: 3000, max: 4000 },
    description: "No spaces around hyphen",
  },
  {
    input: "Pay:4500eur",
    expected: { label: "4500€", min: 4500 },
    description: "No space after colon or before currency",
  },
];

// ============================================================================
// 4. LANGUAGE VARIATIONS (Kieliversiot)
// ============================================================================
const languageCases: TestCase[] = [
  {
    input: "Månadslön 3400 €",
    expected: { label: "3400€", min: 3400 },
    description: "Swedish 'Månadslön' (Monthly salary)",
  },
  {
    input: "Lön: 3000 - 4000 euro",
    expected: { label: "3000–4000€", min: 3000, max: 4000 },
    description: "Swedish 'Lön' (Salary)",
  },
  {
    input: "Gross salary 4000 EUR",
    expected: { label: "4000€", min: 4000 },
    description: "English 'Gross salary'",
  },
  {
    input: "Base pay of 3200 euros",
    expected: { label: "3200€", min: 3200 },
    description: "English 'Base pay'",
  },
];

// ============================================================================
// 5. BONUS & EXTRA (Bonukset)
// ============================================================================
const bonusCases: TestCase[] = [
  {
    input: "Palkka 3000€ + 500-1000€ tulospalkkio kuukausittain",
    expected: { label: "3000€ + bonus", min: 3000 },
    description: "Salary with Finnish bonus",
  },
];

// ============================================================================
// 6. FALSE POSITIVES (Virheelliset osumat - nämä TULEE olla null)
// ============================================================================
const falsPositiveCases: TestCase[] = [
  // Large corporate numbers (Revenue, Sales, Budget)
  {
    input: "2024: 20,4 miljardia euroa // 102 600 työntekijää",
    expected: null,
    description: "Company stats with billions",
  },
  {
    input: "Annual turnover of 2.5 billion euros",
    expected: null,
    description: "Annual turnover",
  },
  {
    input: "sales in 2024 were about EUR 4.9 billion.",
    expected: null,
    description: "Real data (Wärtsilä): Sales figures",
  },
  {
    input: "Harvia’s revenue totaled EUR 175.2 million in 2024.",
    expected: null,
    description: "Real data (Harvia): Company revenue",
  },
  {
    input: "Våra cirka 130 yrkesverksamma ansvarar för en årlig budget på cirka 50 miljoner euro.",
    expected: null,
    description: "Real data (LUVN): Swedish budget '50 miljoner euro'",
  },
  {
    input: "vuoden 2026 ICT-investointeihin on varattu 24 miljoonaa euroa.",
    expected: null,
    description: "Real data (LUVN): Investments '24 miljoonaa'",
  },
  {
    input: "Harvian liikevaihto vuonna 2024 oli 175,2 miljoonaa euroa.",
    expected: null,
    description: "Real data (Harvia): 'liikevaihto' (turnover)",
  },
  {
    input: "vuosibudjettimme on noin 2 miljardia euroa",
    expected: null,
    description: "Real data (Väylävirasto): 'vuosibudjetti'",
  },
  {
    input: "hallinnoimamme väyläomaisuuden arvo on 20 miljardia euroa",
    expected: null,
    description: "Real data (Väylävirasto): 'omaisuuden arvo'",
  },

  // Benefits & Small amounts
  {
    input: "Du får 200 € per år att använda enligt dina önskemål för kultur...",
    expected: null,
    description: "Swedish yearly benefit (too low)",
  },
  {
    input: "saat käyttöösi vuodessa 200 €, jonka voit käyttää toiveidesi mukaan",
    expected: null,
    description: "Real data (Metsähallitus): Yearly benefit 200€",
  },
  {
    input: "kuten jopa 550 euron Epassi Flex -edun käytettäväksi työmatkoihin",
    expected: null,
    description: "Real data (Helsinki): Benefit value",
  },
  {
    input: "Saat käyttöösi 7100 € työvälineiden hankkimiseen.",
    expected: null,
    description: "Real data (Nitor): Equipment budget",
  },
  {
    input: "palkitsemme Suorittamasi Sertifikaatit Bonuksin (500-2000 €/sertifikaatti).",
    expected: null,
    description: "Real data (Nitor): One-time bonus",
  },
  {
    input: "Earn up to €1,000 for referring new hires.",
    expected: null,
    description: "Real data (CUJO AI): Referral reward",
  },

  // Hourly rates
  {
    input: "Palkka 15 € / h",
    expected: null,
    description: "Hourly wage",
  },
  {
    input: "Salary 18-25 euros per hour",
    expected: null,
    description: "Hourly range",
  },
  {
    input: "tuntipalkkasi asettuu 16-20 euron välille",
    expected: null,
    description: "Real data (Worker): Hourly wage range",
  },

  // Unpaid / Vague
  {
    input: "Tämä rooli on alkuvaiheessa palkaton ja osa-aikaisuus on täysin mahdollinen.",
    expected: null,
    description: "Real data (AINIQ): 'palkaton' (unpaid)",
  },
  {
    input: "Compensation: Unpaid trainee position",
    expected: null,
    description: "Real data (Jobla): 'Unpaid'",
  },
  {
    input: "kansainvälinen bisnes, jolla voit tienata satoja tuhansia euroja nopeastikin.",
    expected: null,
    description: "Real data (AINIQ): Speculative 'satoja tuhansia'",
  },

  // Numbers that look like money but aren't
  {
    input: "Established in 2024. Revenue 0.",
    expected: null,
    description: "Year 2024",
  },
  {
    input: "Call us at +358 40 123 4567 for info.",
    expected: null,
    description: "Phone number with spaces",
  },
  {
    input: "tiedustelut pe klo 14-16 tel 045-1200 823 / Elina",
    expected: null,
    description: "Phone number with dashes and spaces",
  },
  {
    input: "We have 500 employees across Europe.",
    expected: null,
    description: "Employee count near location",
  },
];

// ============================================================================
// 7. EDGE CASES (Rajatapaukset)
// ============================================================================
const edgeCases: TestCase[] = [
  {
    input: "",
    expected: null,
    description: "Empty string",
  },
  {
    input: "This job posting has no salary information.",
    expected: null,
    description: "No salary info at all",
  },
  {
    input: "Competitive salary",
    expected: null,
    description: "Generic salary mention without numbers",
  },
  {
    input: "Salary: negotiable",
    expected: null,
    description: "Negotiable salary",
  },
];

// ============================================================================
// 8. NEW & TRICKY CASES (Uudet, itse keksityt haastavat tapaukset)
// ============================================================================
const trickyCases: TestCase[] = [
  // Dates looking like ranges
  {
    input: "Hakuajat: 1.2. - 28.2.2025",
    expected: null,
    description: "Dates separated by dash (looks like 1200-28200 if dots ignored)",
  },
  {
    input: "Projekti on ajalla 2025-2026.",
    expected: null,
    description: "Years range",
  },

  // Working hours
  {
    input: "Työaika on klo 8.00 - 16.00",
    expected: null,
    description: "Working hours range",
  },

  // Commission / Provision models
  {
    input: "Pohjapalkka 2000 € + provisio (keskiansio 4000 €/kk)",
    expected: { label: "2000€ + bonus", min: 2000 },
    description: "Base salary + provision. Should detect base. (Or average depending on logic)",
  },

  // 'k' notation (common in IT/Startup, though less official)
  {
    input: "Salary 4k - 5k eur/month",
    expected: { label: "4000–5000€", min: 4000, max: 5000 },
    description: "'k' notation for thousands",
  },

  // Typos and weird spacing
  {
    input: "Palkka 3000eur/kk",
    expected: { label: "3000€", min: 3000 },
    description: "No space between amount and currency unit 'eur'",
  },

  // Range with words
  {
    input: "Palkka 3000 eurosta 4000 euroon",
    expected: { label: "3000–4000€", min: 3000, max: 4000 },
    description: "Finnish 'from X to Y' using cases",
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTests() {
  const allTests: { category: string; cases: TestCase[] }[] = [
    { category: "Standard Ranges", cases: rangeCases },
    { category: "Single Amounts", cases: singleAmountCases },
    { category: "Formatting & Punctuation", cases: formattingCases },
    { category: "Language Variations", cases: languageCases },
    { category: "Bonuses & Extras", cases: bonusCases },
    { category: "False Positives", cases: falsPositiveCases },
    { category: "Edge Cases", cases: edgeCases },
    { category: "New & Tricky Cases", cases: trickyCases }, // Added category
  ];

  let passed = 0;
  let failed = 0;
  const failures: { category: string; test: TestCase; actual: ExtractedSalary | null }[] = [];

  console.log("\n🚀 STARTING COMPREHENSIVE SALARY EXTRACTION TESTS\n");

  for (const { category, cases } of allTests) {
    console.log(`📦 ${category}`);
    console.log("─".repeat(60));

    for (const testCase of cases) {
      const actual = extractSalaryRaw(testCase.input);
      // Simple JSON comparison for test equality
      const isPass = JSON.stringify(actual) === JSON.stringify(testCase.expected);

      if (isPass) {
        passed++;
        // Optional: Uncomment to see passing tests
        // console.log(`  ✅ ${testCase.description || testCase.input.slice(0, 50)}`);
      } else {
        failed++;
        failures.push({ category, test: testCase, actual });
        console.log(`  ❌ ${testCase.description || testCase.input.slice(0, 50)}`);
        console.log(`     Input:    "${testCase.input}"`);
        console.log(`     Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`     Actual:   ${JSON.stringify(actual)}`);
      }
    }
    console.log(`  ${cases.length} tests run.`);
  }

  console.log("\n" + "═".repeat(60));
  console.log(`📊 TOTAL RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("═".repeat(60));

  if (failures.length > 0) {
    console.log("\n❌ DETAILED FAILURES SUMMARY:");
    for (const f of failures) {
      console.log(`\n  [${f.category}] ${f.test.description}`);
      console.log(`  Input:    "${f.test.input}"`);
      console.log(`  Expected: ${JSON.stringify(f.test.expected)}`);
      console.log(`  Actual:   ${JSON.stringify(f.actual)}`);
    }
    process.exit(1);
  } else {
    console.log("\n✅ All systems operational. Salary extraction is robust.");
    process.exit(0);
  }
}

// Run tests when executed directly
runTests();
