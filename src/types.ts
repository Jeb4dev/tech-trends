export interface Results {
  heading: string;
  date_posted: string;
  slug: string;
  municipality_name: string;
  export_image_url: string;
  company_name: string;
  descr: string;
  latitude: string | null;
  longitude: string | null;
  last_seen_at?: string;
  // Cached lowercase variants to avoid recomputing repeatedly during filtering
  _headingLower?: string;
  _descrLower?: string;
}

export interface ResponseData {
  count: number;
  next: string | null;
  previous: string | null;
  results: Results[];
}

export type Category = {
  label: string;
  active: boolean;
  openings: Results[];
  filteredOpenings: Results[];
};

export type Data = {
  languages: Category[];
  frameworks: Category[];
  databases: Category[];
  cloud: Category[];
  devops: Category[];
  dataScience: Category[];
  cyberSecurity: Category[];
  softSkills: Category[];
  positions: Category[];
  seniority: Category[];
  workMode?: Category[]; // new classification (Remote / Hybrid / On-site)
  cities?: Category[];
  salary?: Category[]; // salary ranges
};

export type QueryParams = {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  devops: string[];
  dataScience: string[];
  cyberSecurity: string[];
  softSkills: string[];
  positions: string[];
  seniority: string[];
  workMode: string[]; // new query param
  companies: string[];
  locations: string[];
  cities?: string[];
  salary?: string[]; // salary range filters
  minDate: string[];
  maxDate: string[];
  activeToday: string[]; // presence of any value => filter to last_seen today
};
