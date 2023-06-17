import Link from "next/link";

interface Results {
  heading: string;
  date_posted: string;
  slug: string;
  municipality_name: string;
  export_image_url: string;
  company_name: string;
  descr: string;
  latitude: string;
  longitude: string;
}

interface ResponseData {
  count: number;
  next: string;
  previous: string;
  results: Results[];
}

export default async function Data() {
  const data = await fetch(
    "https://duunitori.fi/api/v1/jobentries?format=json&search=ohjelmointi+ja+ohjelmistokehitys+%28ala%29"
  );

  let _data: ResponseData = await data.json();

  for (let i = 0; i < 100; i++) {
    if (!_data.next) break;
    let nextData = await fetch(_data.next);
    let _nextData: ResponseData = await nextData.json();
    _data.results = _data.results.concat(_nextData.results);
    _data.next = _nextData.next;
  }

  // save to file
  const fs = require("fs");
  // fs.writeFile("data.json", JSON.stringify(_data), function (err: any) {
  //   if (err) return console.log(err);
  //   console.log("Hello World > helloworld.txt");
  // });

  const languages = [
    ["JavaScript", "JS", "javascriptillä", "javascriptiä"],
    ["TypeScript", "TS", "typescriptillä", "typescriptiä"],
    ["Python", "Py"],
    "Java",
    "C#",
    "PHP",
    "Ruby",
    "C++",
    ["C", "Clang", "C-lang", "C-kieli"],
    ["Golang", "Go-lang"],
    "Rust",
    "Scala",
    "Kotlin",
    "Swift",
    "Objective-C",
    "Perl",
    "Haskell",
    "Clojure",
    "Erlang",
    "Elixir",
    "Dart",
    "Julia",
    "Lua",
    "R",
    "Bash",
    "Shell",
    "PowerShell",
    "Assembly",
  ];
  const frameworks = [
    ["Node", "Node.js", "NodeJS"],
    ["React", "React.js", "ReactJS"],
    ["Vue", "Vue.js", "VueJS"],
    ["Angular", "Angular.js", "AngularJS"],
    ["Svelte", "Svelte.js", "SvelteJS"],
    ["NextJS", "Next.js"],
    ["Nuxt", "Nuxt.js", "NuxtJS"],
    ["Gatsby", "Gatsby.js", "GatsbyJS"],
    ["Ember", "Ember.js", "EmberJS"],
    ["Express", "ExpressJS", "Express.js"],
    "Gatsby",
    "Django",
    "Rails",
    "Flask",
    "Spring",
    "Laravel",
    "Symfony",
    ["ASP.NET", " ASP"],
    ".NET",
    ["Electron", "Electron.js", "ElectronJS"],
    ["Flutter", "Flutter.js", "FlutterJS"],
    ["React Native", "ReactNative", "React-Native"],
    ["Ionic", "Ionic.js", "IonicJS"],
    ["REST", "RESTful"],
  ];
  const databases = [
    "SQL",
    "MySQL",
    "PostgreSQL",
    "SQLite",
    "MariaDB",
    "MongoDB",
    "DynamoDB",
    "Redis",
    "Cassandra",
    "Microsoft SQL Server",
    "MS-SQL",
    "Oracle Database",
    "IBM Db2",
    "SAP HANA",
    "Teradata",
    "noSQL",
  ];
  const cloud = [
    "AWS",
    "Azure",
    "Google Cloud",
    "Digital Ocean",
    "Heroku",
    "Netlify",
    "Vercel",
    "Firebase",
    "Cloudflare",
    "Linode",
    "Rackspace",
    "IBM Cloud",
    "Alibaba Cloud",
    "Oracle Cloud",
    "VMware Cloud",
  ];
  const devops = [
    "Git",
    "GitHub",
    "GitLab",
    "Bitbucket",
    "Jenkins",
    "CircleCI",
    "Travis CI",
    "GitLab CI/CD",
    "Ansible",
    "Chef",
    "Puppet",
    "Docker",
    "Kubernetes",
    "Terraform",
    "AWS CloudFormation",
    "Nagios",
    "Splunk",
    "Elasticsearch",
    "Logstash",
    "Kibana",
    "Nginx",
    "Agile",
    "Scrum",
    "Kanban",
    "CI/CD",
    "DevOps",
  ];
  const softSkills = [
    ["Communication", "Viestintä", "kommunikointi", "kommunikaaatio"],
    ["Teamwork", "Tiimityöskentely", "Collaboration", "Yhteistyö", "tiimityö", "team player"],
    ["Problem Solving", "Problem-solving", "Ongelmanratkaisu", "critical thinking"],
    ["Innovation", "Creativity", "Creative", "Luovuus", "Innova", "luova"],
    ["Time management", "Ajanhallinta", "prioritize", "priorisoi"],
    ["Adaptability", "Mukautuvuus", "sopeutuvuus", "sopeutumis"],
    ["Flexibility", "Joustavuus"],
    ["Leadership", "Johtajuus", "johtaminen", "johtaa", "tiimin vetäjä"],
    ["People skills", "ihmisläheinen"],
    ["Work ethic", "Työmoraali"],
    ["Dedication", "Sitoutuminen"],
    ["Reliability", "Luotettavuus"],
    ["Optimism", "Positiivinen asenne", "Positive attitude", "Optimismi", "positiivinen", "positiivisuus"],
    ["Customer Service", "asiakaspalvelu", "asiakaspalveluhenki", "asiakaslähtöi"],
    ["Motivation", "motivaatio", "motivoitunut"],
    ["Empathy", "Empatia"],
    ["Patience", "Kärsivällisyys", "kärsivällinen"],
    ["Accountability", "Vastuullisuus", "vastuullinen"],
    ["Self-directed", "itsenäinen", "itseohjautuva"],
    ["Curiosity", "utelias"],
    ["Pressure Tolerance", "paineensietokyky", "paineensieto", "under pressure"],
    ["Feedback", "palautetta", "palaute"],
  ];

  const escapeRegExpLang = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const _languages = languages
    .map((language) => {
      const languages = Array.isArray(language) ? language : [language];
      const escapedLanguages = languages.map(escapeRegExpLang);
      const regexString = escapedLanguages.join("|");
      const regex = new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "gi");

      return {
        language: languages[0],
        count: _data.results.reduce((a, b) => {
          regex.lastIndex = 0;
          return a + (regex.test(b.descr) ? 1 : 0);
        }, 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  const _frameworks = frameworks
    .map((framework): { count: number; framework: string } => {
      const frameworks = Array.isArray(framework) ? framework : [framework];
      const escapedLanguages = frameworks.map(escapeRegExpLang);
      const regexString = escapedLanguages.join("|");
      const regex = new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "gi");

      return {
        framework: frameworks[0],
        count: _data.results.reduce((a, b) => {
          regex.lastIndex = 0;
          return a + (regex.test(b.descr) ? 1 : 0);
        }, 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  const _databases = databases
    .map((database) => {
      return {
        database: database,
        count: _data.results.reduce((a, b) => a + (b.descr.toLowerCase()?.includes(database.toLowerCase()) ? 1 : 0), 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  const _cloud = cloud
    .map((cloud) => {
      return {
        cloud: cloud,
        count: _data.results.reduce((a, b) => a + (b.descr.toLowerCase()?.includes(cloud.toLowerCase()) ? 1 : 0), 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  const escapeRegExpDevOps = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const _devops = devops
    .map((devops) => {
      const escapedDevops = escapeRegExpDevOps(devops);
      const regex = new RegExp(`\\b${escapedDevops}\\b`, "gi");
      return {
        devops: devops,
        count: _data.results.reduce((a, b) => a + (b.descr?.match(regex)?.length || 0), 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  const escapeRegExpSoftSkills = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const _softSkills = softSkills
    .map((skill) => {
      const skills = Array.isArray(skill) ? skill : [skill];
      const escapedSkills = skills.map(escapeRegExpSoftSkills);
      const regexString = escapedSkills.join("|");
      const regex = new RegExp(`\\b(?:${regexString})`, "gi");
      return {
        skill: skills[0],
        count: _data.results.reduce((a, b) => a + (regex.test(b.descr) ? 1 : 0), 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  // get location_name and count
  const locationCounts = _data.results.reduce((acc: { [key: string]: number }, result) => {
    acc[result.municipality_name] = (acc[result.municipality_name] || 0) + 1;
    return acc;
  }, {});

  // sort locationCounts by count
  const sortedLocationsArray = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([location, count]) => ({ location, count }))
    .slice(0, 30);

  // get company_name and count
  const companyCounts = _data.results.reduce((acc: { [key: string]: number }, result) => {
    acc[result.company_name] = (acc[result.company_name] || 0) + 1;
    return acc;
  }, {});

  // sort companyCounts by count, slice 0, 30
  const sortedCompaniesArray = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
    .slice(0, 30);

  return (
    <div>
      <div>
        <div className={"flex flex-col sm:flex-row sm:items-center sm:justify-between"}>
          <h1>Job Listings ({_data.results.length})</h1>

          <h3>Source duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)</h3>
          <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
        </div>

        <div className={"flex flex-col sm:flex-row gap-8 pt-4 sm:justify-between"}>
          <div>
            <h2>Languages</h2>
            <ul>
              {/*only show languages that have at least one job listing*/}
              {_languages.map((language) => {
                if (language.count > 0) {
                  return (
                    <li key={language.language}>
                      {language.language} ({language.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div>
            <h2>Frameworks</h2>
            <ul>
              {_frameworks.map((framework) => {
                if (framework.count > 0) {
                  return (
                    <li key={framework.framework}>
                      {framework.framework} ({framework.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div>
            <h2>Databases</h2>
            <ul>
              {_databases.map((database) => {
                if (database.count > 0) {
                  return (
                    <li key={database.database}>
                      {database.database} ({database.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div>
            <h2>Cloud</h2>
            <ul>
              {_cloud.map((cloud) => {
                if (cloud.count > 0) {
                  return (
                    <li key={cloud.cloud}>
                      {cloud.cloud} ({cloud.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div>
            <h2>DevOps</h2>
            <ul>
              {_devops.map((devops) => {
                if (devops.count > 0) {
                  return (
                    <li key={devops.devops}>
                      {devops.devops} ({devops.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div>
            <h2>Soft Skills</h2>
            <ul>
              {_softSkills.map((skill) => {
                if (skill.count > 0) {
                  return (
                    <li key={skill.skill}>
                      {skill.skill} ({skill.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>
        </div>
        <div></div>
      </div>
      <div>
        <div className={"flex flex-col sm:flex-row gap-8 pt-8 justify-between"}>
          <div className={"sm:max-w-[20%]"}>
            <h2>Top 30 Companies</h2>
            <ul>
              {sortedCompaniesArray.map((company) => {
                return (
                  <li key={company.name} className={"flex flex-row"}>
                    ({company.count})&nbsp;<span className={"max-w-[80%] line-clamp-1"}>{company.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2>Primary Location</h2>
            <ul>
              {sortedLocationsArray.map((location) => {
                return (
                  <li key={location.location}>
                    {location.location} ({location.count})
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
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
          <p>
            The data is not 100% accurate. The app is not affiliated with duunitori.fi.
          </p>
        </div>
      </footer>
    </div>
  );
}
