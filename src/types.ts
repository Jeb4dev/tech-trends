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
}

export interface ResponseData {
  count: number;
  next: string | null;
  previous: string | null;
  results: Results[];
}

type Category = {
  label: string;
  count: number;
  openings: Results[];
};

export type Data = {
  languages: Category[];
  frameworks: Category[];
  databases: Category[];
  cloud: Category[];
  devops: Category[];
  softSkills: Category[];
  positions: Category[];
  seniority: Category[];
  dataScience: Category[];
};
