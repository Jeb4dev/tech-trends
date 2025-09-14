import { Category, Results } from "@/types";

// Highlight groups for work mode phrases (used for description highlighting)
export const workModeHighlightGroups: (string | string[])[] = [
  [
    "Remote",
    "Fully remote",
    "Remote-first",
    "Remote first",
    "100% remote",
    "Work from home",
    "WFH",
    "Distributed",
    "Work from anywhere",
    "Location independent",
    "Etätyö",
    "Etänä",
    "Pysyvästi etänä",
  ],
  [
    "Hybrid",
    "Hybrid model",
    "Hybridimalli",
    "Partly remote",
    "Combination of remote and office",
    "Few days in the office",
    "Couple days in the office",
    "Osittain etänä",
    "Osittain toimistolla",
    "Muutama päivä toimistolla",
  ],
  [
    "On-site",
    "Onsite",
    "On site",
    "Office-based",
    "Office based",
    "Paikan päällä",
    "Lähityö",
    "Toimistolla",
    "Asiakkaan tiloissa",
    "Client site",
  ],
];

// Heuristic classification: Remote, Hybrid, On-site (single label per opening)
export function classifyWorkMode(openings: Results[]): Category[] {
  const REMOTE = "Remote";
  const HYBRID = "Hybrid";
  const ONSITE = "On-site";
  const buckets: Record<string, Results[]> = { [REMOTE]: [], [HYBRID]: [], [ONSITE]: [] };

  const remoteStrong = [
    /fully\s+remote/i,
    /100%\s*remote/i,
    /remote[- ]first/i,
    /location\s+independent/i,
    /work\s+from\s+anywhere/i,
    /distributed\s+team/i,
    /etätyö(?!n)/i,
    /etänä\b/i,
    /pysyvästi\s+etänä/i,
  ];
  const remoteIndicators = [
    /remote/i,
    /work\s+from\s+home/i,
    /wfh/i,
    /etätyö/i,
    /etämahdollisuus/i,
    /mahdollisuus\s+etätyöhön/i,
    /osittain\s+etänä/i,
  ];
  const hybridIndicators = [
    /hybrid/i,
    /hybridi/i,
    /hybridimalli/i,
    /hybrid(-| )model/i,
    /partly\s+remote/i,
    /combination\s+of\s+(remote|office)/i,
    /(\d|two|three|few)\s+days?\s+(per\s+week\s+)?(at|in)\s+the\s+office/i,
    /osittain\s+toimistolla/i,
    /muutama\s+p(ä|a)iv(ä|a)\s+toimistolla/i,
  ];
  const onsiteStrong = [
    /on[- ]site\s+only/i,
    /must\s+be\s+on[- ]site/i,
    /(work|työskentelet)\s+(vain|ensisijaisesti)\s+(toimistolla|paikan\s+päällä)/i,
    /ei\s+etätyömahdollisuutta/i,
  ];
  const onsiteIndicators = [
    /on[- ]site/i,
    /office[- ]based/i,
    /paikan\s+päällä/i,
    /lähityö/i,
    /toimistolla/i,
    /asiakkaan\s+tiloissa/i,
    /client\s+site/i,
  ];

  openings.forEach(o => {
    const text = (o.heading + "\n" + o.descr).toLowerCase();
    const countMatches = (arr: RegExp[]) => arr.reduce((acc, r) => { r.lastIndex = 0; const m = text.match(r); return acc + (m ? m.length : 0); }, 0);

    const rs = countMatches(remoteStrong);
    const r = countMatches(remoteIndicators);
    const h = countMatches(hybridIndicators);
    const os = countMatches(onsiteStrong);
    const oi = countMatches(onsiteIndicators);

    let label: string;
    if (rs > 0 && os === 0 && oi === 0 && h === 0) label = REMOTE; else if (h > 0 || ((r > 0 || rs > 0) && (oi > 0 || os > 0))) label = HYBRID; else if (os > 0 || (oi > 0 && r === 0 && rs === 0)) label = ONSITE; else if (r > 0 && (oi === 0 && os === 0)) label = REMOTE; else label = ONSITE; // fallback

    buckets[label].push(o);
  });

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, active: false, openings: list, filteredOpenings: [] }));
}

