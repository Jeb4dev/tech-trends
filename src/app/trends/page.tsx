"use client";

import Link from "next/link";
import { Skills } from "./skill";
import { ResponseData, Results, Data } from "@/types";
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

export default function Data() {
  const [data, setData] = useState<ResponseData>({ count: 0, next: null, previous: null, results: [] });
  const [isLoading, setLoading] = useState(false);
  const params = useSearchParams();

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
            <h1>Job Listings (<span className={"loading-animation"}>{data.results.length}</span>)</h1>

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

  // Query params
  const queryParams = {
    languages: params.getAll("lang").map((q) => q.toLowerCase()),
    frameworks: params.getAll("framework").map((q) => q.toLowerCase()),
    databases: params.getAll("database").map((q) => q.toLowerCase()),
    cloud: params.getAll("cloud").map((q) => q.toLowerCase()),
    devops: params.getAll("devops").map((q) => q.toLowerCase()),
    dataScience: params.getAll("datascience").map((q) => q.toLowerCase()),
    softSkills: params.getAll("softskills").map((q) => q.toLowerCase()),
    positions: params.getAll("position").map((q) => q.toLowerCase()),
    seniority: params.getAll("seniority").map((q) => q.toLowerCase()),
  };

  let categoryData: Data = {
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    devops: [],
    softSkills: [],
    positions: [],
    seniority: [],
    dataScience: [],
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  function matchAll(keywords: (string | string[])[], complicated: boolean = false, slice: number = 30, title = false) {
    return keywords
      .map((keyword) => {
        const openings: Results[] = [];
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
          count: data.results.reduce((a: any, b: any) => {
            const string = title ? b.heading : b.descr;
            regex.lastIndex = 0;
            return (
              a +
              (regex.test(string) &&
              negative &&
              !negative.some((keyword) =>
                title
                  ? b.heading.toLowerCase().includes(keyword.toLowerCase())
                  : b.descr.toLowerCase().includes(keyword.toLowerCase())
              )
                ? 1
                : 0)
            );
          }, 0),
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
        };
      })
      .sort((a, b) => b.count - a.count)
      .filter((keyword) => keyword.count > 0)
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
  populateCategories();

  function filterByQueryParams() {
    queryParams.languages.forEach((qLang) => {
      const filtered = categoryData.languages.find((item) => {
        return qLang?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.frameworks.forEach((qFramework) => {
      const filtered = categoryData.frameworks.find((item) => {
        return qFramework?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.databases.forEach((qDatabase) => {
      const filtered = categoryData.databases.find((item) => {
        return qDatabase?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.cloud.forEach((qCloud) => {
      const filtered = categoryData.cloud.find((item) => {
        return qCloud?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.devops.forEach((qDevops) => {
      const filtered = categoryData.devops.find((item) => {
        return qDevops?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.dataScience.forEach((qDataScience) => {
      const filtered = categoryData.dataScience.find((item) => {
        return qDataScience?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.softSkills.forEach((qSoftSkills) => {
      const filtered = categoryData.softSkills.find((item) => {
        return qSoftSkills?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.positions.forEach((qPositions) => {
      const filtered = categoryData.positions.find((item) => {
        return qPositions?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });

    queryParams.seniority.forEach((qSeniority) => {
      const filtered = categoryData.seniority.find((item) => {
        return qSeniority?.includes(item.label.toLowerCase());
      });
      data.results = filtered?.openings ?? data.results;
    });
  }

  filterByQueryParams();
  populateCategories();

  // get location_name and count
  const locationCounts = data.results.reduce((acc: { [key: string]: number }, result) => {
    acc[result.municipality_name] = (acc[result.municipality_name] || 0) + 1;
    // remove null values
    acc["null"] = -1;
    acc[""] = -1;
    return acc;
  }, {});
  // sort locationCounts by count
  const sortedLocationsArray = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
    .slice(0, 30);
  // get company_name and count
  const companyCounts = data.results.reduce((acc: { [key: string]: number }, result) => {
    acc[result.company_name] = (acc[result.company_name] || 0) + 1;
    return acc;
  }, {});
  // sort companyCounts by count, slice 0, 30
  const sortedCompaniesArray = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
    .slice(0, 30);

  return (
    <div className={"px-8 sm:px-0"}>
      <div>
        <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"}>
          <h1>Job Listings ({data.results.length})</h1>

          <h3 className={"text-sm sm:text-2xl line-clamp-4"}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
        </div>

        <div className={"categories"}>
          <div>
            <h2>Languages</h2>
            <Skills skills={categoryData.languages} />
          </div>

          <div>
            <h2>Frameworks</h2>
            <Skills skills={categoryData.frameworks} />
          </div>

          <div>
            <h2>Databases</h2>
            <Skills skills={categoryData.databases} />
          </div>

          <div>
            <h2>Cloud</h2>
            <Skills skills={categoryData.cloud} />
          </div>

          <div>
            <h2>DevOps</h2>
            <Skills skills={categoryData.devops} />
          </div>

          <div>
            <h2>Soft Skills</h2>
            <Skills skills={categoryData.softSkills} />
          </div>

          <div className={"sm:max-w-[25%]"}>
            <h2>Top Companies</h2>
            <Skills skills={sortedCompaniesArray} />
          </div>

          <div>
            <h2>Primary Location</h2>
            <Skills skills={sortedLocationsArray} />
          </div>

          <div>
            <h2>Role</h2>
            <Skills skills={categoryData.positions} />
          </div>

          <div>
            <h2>Seniority</h2>
            <Skills skills={categoryData.seniority} />
          </div>

          <div>
            <h2>Data Science</h2>
            <Skills skills={categoryData.dataScience} />
          </div>

        </div>
      </div>
      <Openings openings={data.results} />
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
