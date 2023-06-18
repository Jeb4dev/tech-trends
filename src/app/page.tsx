import Link from "next/link";
import { Skills } from "./skill";

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
    ["Java", "Javaa", "Javalla", "Javasta"],
    "C#",
    "PHP",
    "Ruby",
    "C++",
    ["C", "Clang", "C-lang", "C-kieli"],
    ["Golang", "Go-lang", "Golangia", "Go ohjelmistokehittäjä", "Golangiin"],
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
    ["Assembly", "ASM"],
    "MATLAB",
    ["Visual Basic", "VBA"],
    "COBOL",
    "Fortran",
    "Lisp",
    "Pascal",
    "Delphi",
    "LabVIEW",
    "Ada",
    "PL/SQL",
    "Prolog",
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
    ["Jupyter Notebook", "JupyterNotebook", "Jupyter"],
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
    ["GraphQL", "Graph QL", "Graph-QL"],
    ["WordPress", "Word Press", "Word-Press"],
    ["Shopify", "Shopify.js", "ShopifyJS"],
    ["WooCommerce", "Woo Commerce", "Woo-Commerce"],
    ["Bootstrap", "Bootstrap.js", "BootstrapJS"],
    ["Tailwind", "Tailwind.js", "TailwindJS"],
    ["Unreal Engine", "UnrealEngine", "Unreal-Engine"],
    ["Unity", "Unity.js", "UnityJS"],
    ["TensorFlow", "Tensor Flow", "Tensor-Flow"],
    ["PyTorch", "Py Torch", "Py-Torch"],
    ["Keras", "Keras.js", "KerasJS"],
    ["Pandas", "Pandas.js", "PandasJS"],
    ["NumPy", "NumPy.js", "NumPyJS"],
  ];
  const databases = [
    ["Relational databases", "SQL", "mySQL", "PostgreSQL", "SQLite"],
    ["NoSQL databases", "noSQL", "no-SQL", "MongoDB", "DynamoDB", "Redis", "Cassandra", "Neo4j"],
    ["Vector databases", "vectorDB", "vector-database", "vektori tietokannat", "vektori tietokanta"],
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
    "Neo4j",
    "ArangoDB",
    "Couchbase",
    "CouchDB",
  ];
  const cloud = [
    ["AWS", "Amazon Web Services", "S3 Bucket", "EC2"],
    ["Azure", "Microsoft Cloud"],
    ["Google Cloud", "GCP"],
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
    "Red Hat Cloud",
    "Salesforce Cloud",
    "SAP Cloud",
    ["Cloud", "Pilvi", "pilvipalveluiden", "pilvipalvelu"],
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
    ["Problem Solving", "Problem-solving", "Ongelmanratkaisu", "critical thinking", "problem solver"],
    ["Innovation", "Creativity", "Creative", "Luovuus", "Innova", "luova"],
    ["Time management", "Ajanhallinta", "prioritize", "priorisoi"],
    ["Adaptability", "Mukautuvuus", "sopeutuvuus", "sopeutumis"],
    ["Flexibility", "Joustavuus"],
    ["Leadership", "Johtajuus", "johtaminen", "johtaa", "tiimin vetäjä", "Team leading", "team leader"],
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
    ["Pressure Tolerance", "paineensietokyky", "paineensieto", "under pressure", "paineen alla"],
    ["Feedback", "palautetta", "palaute", "palautteen"],
  ];
  const positions = [
    ["Full Stack", "Full-Stack", "Fullstack"],
    ["Front End", "Front-End", "Frontend", "frontti"],
    ["Back End", "Back-End", "Backend", "bäkkäri"],
    [
      "Software Engineer",
      "Software Developer",
      "SW Developer",
      "Ohjelmistokehittäjä",
      "Ohjelmoija",
      "Koodari",
      "Koodaaja",
      "Kehittäjä",
      "Developer",
    ],
    ["Software Architect", "Software Architecture", "Arkkitehti"],
    ["Web Developer", "Web Development", "web-kehitys", "web-kehittäjä"],
    ["Mobile Developer", "Mobile Development", "mobiilikehitys", "mobiilikehittäjä"],
    ["DevOps Engineer", "DevOps Developer", "CI-/DevOps"],
    ["Data Engineer", "Data Engineering"],
    ["Data Scientist", "Data Science", "Data Engineer"],
    ["Machine Learning Engineer", "Machine Learning"],
    ["Cloud Engineer", "Cloud Engineering"],
    ["Embedded", "Sulautetut"],
    ["Cyber Security", "Security Engineering", "Security Engineer", "Tietoturva"],
    ["QA Engineer", "QA Engineering", "Test Engineer", "Test Engineering", "Testauksen"],
    ["UX Designer", "UX Design", "Käytettävyys", "Saavutettavuus"],
    ["UI Designer", "UI Design", "Käyttöliittymäsuunnittelija", "Käyttöliittymäsuunnittelu"],
    ["Designer", "Suunittelija"],
    ["System Administrator", "System Administration", "Järjestelmänvalvoja", "järjestelmävastaava"],
    ["System Specialist", "System Specialist", "Järjestelmäasiantuntija"],
    ["Product Manager", "Product Management", "Product Owner"],
    ["Project Manager", "Project Management"],
    ["Business Analyst", "Business Analysis"],
    ["Scrum Master"],
    ["AI Engineer", "Machine Learning Engineer", "AI Programmer"],
    ["Blockchain Engineer", "Blockchain Developer", "Lohjoketju"],
    ["Game Developer", "Game Development", "Pelikehittäjä", "Pelikehitys"],
    ["Game Designer", "Game Design", "Pelisuunnittelija", "Pelisuunnittelu"],
  ];
  const seniorities = [
    ["Intern / Trainee", "Intern", "Trainee", "Harjoittelija", "harjoittelu", "digistar"],
    ["Junior", "Juniori", "entry", "junnu"],
    ["Mid", "Mid-level", "Mid level", "Midlevel", "Mid Level", "Mid-Level", "Mid Level", "Midlevel"],
    ["Senior", "Seniori", "senior", "sennu"],
    [
      "Lead",
      "Lead Developer",
      "Lead Engineer",
      "Lead Programmer",
      "Lead Designer",
      "Lead Architect",
      "Tiimin vetäjä",
      "Johtava kehittäjä",
      "Johtava suunnittelija",
      "Johtava arkkitehti",
      "Johtava ohjelmoija",
      "Johtava insinööri",
      "Johtava koodari",
      "Principal",
    ],
    ["Head", "Head of", "Head Engineer", "Head Developer", "Head Architect", "päällikkö"],
  ];

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  function matchAll(keywords: (string | string[])[], complicated: boolean = false, slice: number = 30) {
    const _keywords = keywords
      .map((keyword) => {
        const keywords = Array.isArray(keyword) ? keyword : [keyword];
        const escapedKeywords = keywords.map(escapeRegExp);
        const regexString = escapedKeywords.join("|");

        const regex = complicated
          ? new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "gi")
          : new RegExp(`\\b(?:${regexString})`, "gi");

        return {
          label: keywords[0],
          count: _data.results.reduce((a, b) => {
            regex.lastIndex = 0;
            return a + (regex.test(b.descr) ? 1 : 0);
          }, 0),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, slice)
      .filter((keyword) => keyword.count > 0);
    return _keywords;
  }

  const _languages = matchAll(languages, true);
  const _frameworks = matchAll(frameworks, true);
  const _databases = matchAll(databases, true);
  const _cloud = matchAll(cloud, true);
  const _devops = matchAll(devops, true);
  const _softSkills = matchAll(softSkills, false);
  const _positions = matchAll(positions, false);
  const _seniority = matchAll(seniorities, true);

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
    <div className={"px-8 sm:px-0"}>
      <div>
        <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"}>
          <h1>Job Listings ({_data.results.length})</h1>

          <h3 className={"text-sm sm:text-2xl line-clamp-4"}>Source duunitori.fi/api/v1/jobentries?search=ohjelmointi+ja+ohjelmistokehitys+(ala)</h3>
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
                    <li key={language.label}>
                      {language.label} ({language.count})
                    </li>
                  );
                }
              })}
            </ul>
          </div>

          <div>
            <h2>Frameworks</h2>
            <ul>
              {_frameworks.map((frameworks) => {
                if (frameworks.count > 0) {
                  return (
                    <li key={frameworks.label}>
                      {frameworks.label} ({frameworks.count})
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
                    <li key={database.label}>
                      {database.label} ({database.count})
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
                    <li key={cloud.label}>
                      {cloud.label} ({cloud.count})
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
                    <li key={devops.label}>
                      {devops.label} ({devops.count})
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
                    <li key={skill.label}>
                      {skill.label} ({skill.count})
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
          <div>
            <h2>Job Types</h2>
            <ul>
              {_positions.map((position) => {
                return (
                  <li key={position.label}>
                    {position.label} ({position.count})
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2>Job Levels</h2>
            <ul>
              {_seniority.map((seniority) => {
                return (
                  <li key={seniority.label}>
                    {seniority.label} ({seniority.count})
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
          <p>The data is not 100% accurate. The app is not affiliated with duunitori.fi.</p>
        </div>
      </footer>
    </div>
  );
}
