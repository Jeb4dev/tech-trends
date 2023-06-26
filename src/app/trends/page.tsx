"use client";

import Link from "next/link";
import { Skills } from "./skill";
import { Category, Data, QueryParams, ResponseData, Results } from "@/types";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cloud,
  databases,
  dataScience,
  devops,
  frameworks,
  languages,
  positions,
  seniority,
  softSkills,
} from "@/keywords";
import { Openings } from "@/app/trends/openings";
import { Slider } from "@/app/trends/slider";

export default function Data() {
  const [data, setData] = useState<ResponseData>({ count: 0, next: null, previous: null, results: [] });
  const [isLoading, setLoading] = useState(false);
  const [categoryData, setCategoryData] = useState<Data>({
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    devops: [],
    dataScience: [],
    softSkills: [],
    positions: [],
    seniority: [],
  });
  const params = useSearchParams();
  const [count, setCount] = useState(0);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    languages: params.getAll("languages").map((q) => q.toLowerCase()),
    frameworks: params.getAll("frameworks").map((q) => q.toLowerCase()),
    databases: params.getAll("databases").map((q) => q.toLowerCase()),
    cloud: params.getAll("cloud").map((q) => q.toLowerCase()),
    devops: params.getAll("devops").map((q) => q.toLowerCase()),
    dataScience: params.getAll("dataScience").map((q) => q.toLowerCase()),
    softSkills: params.getAll("softSkills").map((q) => q.toLowerCase()),
    positions: params.getAll("positions").map((q) => q.toLowerCase()),
    seniority: params.getAll("seniority").map((q) => q.toLowerCase()),
    companies: params.getAll("companies").map((q) => q.toLowerCase()),
    locations: params.getAll("locations").map((q) => q.toLowerCase()),
    minDate: [params.getAll("minDate")[0]],
    maxDate: [params.getAll("maxDate")[0]],
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/v1")
      .then((res) => res.json())
      .then((data: ResponseData) => {
        // @ts-ignore
        setData(data.data);
        setLoading(false);
      });
  }, []);

  if (isLoading)
    return (
      <div className={"px-8 sm:px-0"}>
        <div>
          <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"}>
            <h1>
              Job Listings (<span className={"loading-animation"}>{data.results.length}</span>)
            </h1>

            <h3 className={"text-sm sm:text-2xl line-clamp-4"}>
              Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
            </h3>
            <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
          </div>

          <div className={"categories"}>
            <div>
              <h2>Languages</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Frameworks</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Databases</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Cloud</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>DevOps</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Soft Skills</h2>
              <Skills skills={null} />
            </div>

            <div className={"sm:max-w-[25%]"}>
              <h2>Top Companies</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Primary Location</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Role</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Seniority</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Data Science</h2>
              <Skills skills={null} />
            </div>
          </div>
        </div>
        <Openings openings={null} />
        <hr className={"my-8 border-gray-400"} />
        <footer className={"flex flex-col sm:flex-row justify-between items-center"}>
          <div className={"text-gray-400 max-w-xl"}>
            <h3>How does this work?</h3>
            <p className={"py-2"}>
              The next.js app fetches data from{" "}
              <a href={"https://duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)"}>duunitori.fi</a>{" "}
              public API and tries to match selected keywords from the job listing descriptions. Matching is done with
              regex. Source code available at{" "}
              <a href={"https://github.com/Jeb4dev/tech-trends"}>github.com/Jeb4dev/tech-trends</a>
            </p>
          </div>
          <div className={"text-gray-400 max-w-lg"}>
            <h3 className={"py-2"}>Disclamer</h3>
            <p>The data is not 100% accurate. The app is not affiliated with duunitori.fi.</p>
          </div>
        </footer>
      </div>
    );

  if (!data)
    return (
      <p>
        No data found. Please check the <Link href="/api/v1">API</Link> or try again later.
      </p>
    );

  function matchAll(
    keywords: (string | string[])[],
    complicated: boolean = false,
    slice: number = 50,
    title = false
  ): Category[] {
    return keywords
      .map((keyword) => {
        let openings: Results[] = [];
        const keywords = Array.isArray(keyword) ? keyword : [keyword];
        const escapedKeywords = keywords.map(escapeRegExp);
        const regexString = escapedKeywords.join("|");
        let negative: string[] = keywords
          .filter((keyword) => keyword.startsWith("!"))
          .map((keyword) => {
            return keyword.replace("!", "");
          });

        const regex = complicated
          ? new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "gi")
          : new RegExp(`\\b(?:${regexString})`, "gi");

        return {
          label: keywords[0],
          active: false,
          openings: openings.concat(
            data.results.filter((opening) => {
              regex.lastIndex = 0;
              if (
                negative &&
                negative.some((keyword) =>
                  title
                    ? opening.heading.toLowerCase().includes(keyword.toLowerCase())
                    : opening.descr.toLowerCase().includes(keyword.toLowerCase())
                )
              ) {
                return false;
              }
              return regex.test(title ? opening.heading : opening.descr);
            })
          ),
          filteredOpenings: [],
        };
      })
      .sort((a, b) => b.openings.length - a.openings.length)
      .filter((keyword) => keyword.openings.length > 0)
      .slice(0, slice);
  }

  function populateCategories() {
    categoryData.languages = matchAll(languages, true);
    categoryData.frameworks = matchAll(frameworks, true);
    categoryData.databases = matchAll(databases, true);
    categoryData.languages = matchAll(languages, true);
    categoryData.cloud = matchAll(cloud, true);
    categoryData.devops = matchAll(devops, true);
    categoryData.dataScience = matchAll(dataScience, true);
    categoryData.softSkills = matchAll(softSkills, false);
    categoryData.positions = matchAll(positions, false);
    categoryData.seniority = matchAll(seniority, true);
  }

  function filterByQueryParams() {
    let openings: Results[] = [];
    function getCommon(items: Category[], queryParams: string[]) {
      if (queryParams.length == 0) return;
      items.forEach((item) => {
        if (queryParams.includes(item.label.toLowerCase())) {
          item.active = true;
          openings.length == 0
            ? (openings = openings.concat(item.openings))
            : (openings = openings.filter((opening) => item.openings.includes(opening)));
        }
      });
    }

    function filterCommon(items: Category[]) {
      items.forEach((item) => {
        item.filteredOpenings =
          openings.length == 0 ? item.openings : openings.filter((opening) => item.openings.includes(opening));
      });
    }

    getCommon(categoryData.languages, queryParams.languages);
    getCommon(categoryData.frameworks, queryParams.frameworks);
    getCommon(categoryData.databases, queryParams.databases);
    getCommon(categoryData.cloud, queryParams.cloud);
    getCommon(categoryData.devops, queryParams.devops);
    getCommon(categoryData.dataScience, queryParams.dataScience);
    getCommon(categoryData.softSkills, queryParams.softSkills);
    getCommon(categoryData.positions, queryParams.positions);
    getCommon(categoryData.seniority, queryParams.seniority);
    getCommon(companies, queryParams.companies);
    getCommon(locations, queryParams.locations);

    filterCommon(categoryData.languages);
    filterCommon(categoryData.frameworks);
    filterCommon(categoryData.databases);
    filterCommon(categoryData.cloud);
    filterCommon(categoryData.devops);
    filterCommon(categoryData.dataScience);
    filterCommon(categoryData.softSkills);
    filterCommon(categoryData.positions);
    filterCommon(categoryData.seniority);
    filterCommon(companies);
    filterCommon(locations);

    if (openings.length == 0) openings = data.results;

    return openings;
  }

  function filterByDate(min: Date, max: Date) {
    updateFilter("minDate", `${min.getFullYear()}-${min.getMonth() + 1}-${min.getDate()}`);
    updateFilter("maxDate", `${max.getFullYear()}-${max.getMonth() + 1}-${max.getDate()}`);
  }

  function updateFilter(filter: string, value: string) {
    const url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    const encodedValue = encodeURIComponent(value).replace(/%20/g, "+")

    if (params.has(filter)) {
      if (params.getAll(filter).includes(value)){
        console.log(params, url.search, `${filter}=${encodedValue}`)
        params = new URLSearchParams(url.search.replace(`${filter}=${encodedValue}`, ""));
      } else {
        params.append(filter, value);
      }
    } else if (value) {
      params.append(filter, value);
    }

    setQueryParams({
      ...queryParams,
      [filter]: params.getAll(filter),
    });

    url.search = params.toString();
    window.history.pushState({}, "", url.toString());
  }

  const groupResultsByProperty = (results: Results[], property: keyof Results): Category[] => {
    const categories: Category[] = [];

    results.forEach((result) => {
      const category = categories.find((category) => category.label === result[property]);

      if (category) {
        category.openings.push(result);
      } else {
        categories.push({
          label: result[property]!,
          active: false,
          openings: [result],
          filteredOpenings: [],
        });
      }
    });

    return categories.sort((a, b) => b.openings.length - a.openings.length).filter((category) => category.label);
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  populateCategories();
  const locations = groupResultsByProperty(data.results, "municipality_name");
  const companies = groupResultsByProperty(data.results, "company_name");

  let filteredData: Results[] = filterByQueryParams();

  return (
    <div className={"px-8 sm:px-0"}>
      <div>
        <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"}>
          <h1>Job Listings ({filteredData.length})</h1>

          <h3 className={"text-sm sm:text-2xl line-clamp-4"}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
        </div>

        {/*<div>*/}
        {/*  <Slider min={new Date("06/22/2022")} filteredData={filteredData} filterByDate={filterByDate} />*/}
        {/*</div>*/}

        <div className={"categories"}>
          <div>
            <h2>Languages</h2>
            <Skills
              skills={categoryData.languages}
              category={"languages"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Frameworks</h2>
            <Skills
              skills={categoryData.frameworks}
              category={"frameworks"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Databases</h2>
            <Skills
              skills={categoryData.databases}
              category={"databases"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Cloud</h2>
            <Skills
              skills={categoryData.cloud}
              category={"cloud"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>DevOps</h2>
            <Skills
              skills={categoryData.devops}
              category={"devops"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Soft Skills</h2>
            <Skills
              skills={categoryData.softSkills}
              category={"softSkills"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div className={"sm:max-w-[25%]"}>
            <h2>Top Companies</h2>
            <Skills skills={companies} category={"companies"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>

          <div>
            <h2>Primary Location</h2>
            <Skills skills={locations} category={"locations"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>

          <div>
            <h2>Role</h2>
            <Skills
              skills={categoryData.positions}
              category={"positions"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Seniority</h2>
            <Skills
              skills={categoryData.seniority}
              category={"seniority"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Data Science</h2>
            <Skills
              skills={categoryData.dataScience}
              category={"dataScience"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>
        </div>
      </div>
      <Openings openings={filteredData} />
      <hr className={"my-8 border-gray-400"} />
      <footer className={"flex flex-col sm:flex-row justify-between items-center"}>
        <div className={"text-gray-400 max-w-xl"}>
          <h3>How does this work?</h3>
          <p className={"py-2"}>
            The next.js app fetches data from{" "}
            <a href={"https://duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)"}>duunitori.fi</a>{" "}
            public API and tries to match selected keywords from the job listing descriptions. Matching is done with
            regex. Source code available at{" "}
            <a href={"https://github.com/Jeb4dev/tech-trends"}>github.com/Jeb4dev/tech-trends</a>
          </p>
        </div>
        <div className={"text-gray-400 max-w-lg"}>
          <h3 className={"py-2"}>Disclamer</h3>
          <p>The data is not 100% accurate. The app is not affiliated with duunitori.fi.</p>
        </div>
      </footer>
    </div>
  );
}
