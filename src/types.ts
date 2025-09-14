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
  softSkills: Category[];
  positions: Category[];
  seniority: Category[];
  cities?: Category[]; // newly added optional to avoid breaking older code
};

export type QueryParams = {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  devops: string[];
  dataScience: string[];
  softSkills: string[];
  positions: string[];
  seniority: string[];
  companies: string[];
  locations: string[]; // primary location (municipality_name)
  cities?: string[];   // newly added mentioned cities
  minDate: string[];
  maxDate: string[];
};
