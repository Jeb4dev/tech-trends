import Link from "next/link";
import { Skills } from "./skill";

export interface Results {
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

export default async function Data(context: any) {
  // Query params
  const params = context.searchParams;
  const params_languages: string[] = params.lang?.toLowerCase().split(",");
  const params_frameworks: string[] = params.framework?.toLowerCase().split(",");
  const params_databases: string[] = params.database?.toLowerCase().split(",");
  const params_cloud: string[] = params.cloud?.toLowerCase().split(",");
  const params_devops: string[] = params.devops?.toLowerCase().split(",");
  const params_dataScience: string[] = params.datascience?.toLowerCase().split(",");
  const params_softSkills: string[] = params.softskills?.toLowerCase().split(",");
  const params_positions: string[] = params.position?.toLowerCase().split(",");
  const params_seniorities: string[] = params.seniority?.toLowerCase().split(",");

  // Fetch data
  let data = await fetch(
    "https://duunitori.fi/api/v1/jobentries?format=json&search=Tieto-+ja+tietoliikennetekniikka%28ala%29"
  );
  let _data: ResponseData = await data.json();
  for (let i = 0; i < 20; i++) {
    if (!_data.next) break;
    let nextData = await fetch(_data.next);
    let _nextData: ResponseData = await nextData.json();
    _data.results = _data.results.concat(_nextData.results);
    _data.next = _nextData.next;
  }

  let originalData = JSON.parse(JSON.stringify(_data));

  // save to file
  const fs = require("fs");
  // fs.writeFile("data.json", JSON.stringify(_data), function (err: any) {
  //   if (err) return console.log(err);
  //   console.log("Hello World > helloworld.txt");
  // });

  let languages = [
    ["JavaScript", "JS", "javascriptillä", "javascriptiä"],
    ["TypeScript", "TS", "typescriptillä", "typescriptiä"],
    "Python",
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
  let frameworks = [
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
    ["Ruby on Rails", "Rails"],
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
    "FastAPI",
    "Jquery",
  ];
  let databases = [
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
  let cloud = [
    ["AWS", "Amazon Web Services", "S3 Bucket", "EC2"],
    ["Azure", "Microsoft Cloud"],
    ["Google Cloud", "GCP"],
    "Public cloud",
    ["Private cloud", "on premise"],
    "Hybrid cloud",
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
  let devops = [
    "Git",
    "GitHub",
    "GitHub Actions",
    "GitLab",
    "Bitbucket",
    "Jenkins",
    "CircleCI",
    "Travis CI",
    "GitLab CI/CD",
    "Ansible",
    "Vagrant",
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
    "Pipeline",
    "Taiga",
    "Jira",
    "Confluence",
    "Slack",
    "Trello",
    "Azure DevOps",
  ];
  let dataScience = [
    ["Machine Learning", "Koneoppiminen", "Koneoppimisen"],
    ["Deep Learning", "Syväoppiminen", "Syväoppimisen"],
    ["Reinforcement learning", "Vahvistuoppiminen", "Vahvistuoppimisen"],
    "Big Data",
    ["Data Analysis", "Data Analyst", "Data Analytics", "Data-analyysi", "Data-analyytikko", "Data-analytiikka"],
    ["Data Visualization", "Data Visualisation", "Data Visualisointi", "Data Visualisointi"],
    ["Data Engineering", "Data Engineer", "Data Engineering", "Data Engineer"],
    ["Natural Language Processing", "NLP", "Luonnollisen kielen käsittely", "Luonnollisen kielen käsittely"],
    ["Computer Vision", "konenäkö"],
    ["Statistics", "Statistical Analysis", "Tilastotiede", "Tilastollinen analyysi"],
    ["Business Intelligence", "Bussiness äly"],
    ["Data Warehousing", "Data Warehouse", "Data Warehousing", "Data Warehouse", "Datan varastointi"],
    ["Data pipelines", "Data pipeline"],
    ["Data Modeling", "Data Modelling", "Data Modeler", "Datan mallintaminen", "Datan mallintaja"],
    ["Data Mining", "Data Miner", "Datan kaivaminen", "Datan kaivaja"],
    ["Data Management", "Datan hallinta"],
    ["Artificial Intelligence", "Tekoäly", "Tekoälyt", "tekoäly", "tekoälyt"],
  ];
  let softSkills = [
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
  let positions = [
    ["Full Stack", "Full-Stack", "Fullstack"],
    ["Front End", "Front-End", "Frontend", "frontti"],
    ["Back End", "Back-End", "Backend", "bäkkäri"],
    ["Consultant", "Consulting", "Konsultti", "Konsultointi"],
    [
      "Software Developer",
      "Software Engineer",
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
    ["Cyber Security", "Security Engineering", "Security Engineer", "Tietoturva", "Tietoturvakonsultti"],
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
    ["AI Engineer", "Machine Learning Engineer", "AI Programmer", "Tekoäly", "AI Developer"],
    ["Blockchain Engineer", "Blockchain Developer", "Lohjoketju"],
    ["Game Developer", "Game Development", "Pelikehittäjä", "Pelikehitys"],
    ["Game Designer", "Game Design", "Pelisuunnittelija", "Pelisuunnittelu"],
    ["Test Automation", "Testausautomaatio"],
  ];
  let seniorities = [
    [
      "Intern / Trainee",
      "Intern ",
      "intern,",
      "Trainee",
      "Harjoittelija",
      "harjoittelu",
      "digistar",
      "!intern coach",
      "!Senior Trainee",
      "!Data Trainee Hamid",
      "vastavalmistunut",
    ],
    [
      "Junior",
      "Juniori",
      "entry",
      "junnu",
      "!mentor more",
      "!mentor colleagues",
      "!mentor junior",
      "!junior colleagues",
      "!lead and mentor",
      "!guide junior",
      "!guiding ",
      "!mentoring ",
      "!not an entry",
      "!coach junior",
      "!oversee ",
      "!more junior",
      "!support junior",
      "!guidance to junior",
      "!• Hybridityö Junior",
    ],
    ["Mid", "Mid-level", "Mid level", "Midlevel", "Mid Level", "Mid-Level", "Mid Level", "Midlevel"],
    ["Senior", "Seniori", "senior", "sennu", "!senior colleagues"],
    [
      "Lead ",
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

  let _languages: { label: string; count: number; openings: Results[] }[];
  let _frameworks: { label: string; count: number; openings: Results[] }[];
  let _databases: { label: string; count: number; openings: Results[] }[];
  let _cloud: { label: string; count: number; openings: Results[] }[];
  let _devops: { label: string; count: number; openings: Results[] }[];
  let _softSkills: { label: string; count: number; openings: Results[] }[];
  let _positions: { label: string; count: number; openings: Results[] }[];
  let _seniority: { label: string; count: number; openings: Results[] }[];
  let _dataScience: { label: string; count: number; openings: Results[] }[];

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  function matchAll(keywords: (string | string[])[], complicated: boolean = false, slice: number = 30) {
    const _keywords = keywords
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
          count: _data.results.reduce((a, b) => {
            regex.lastIndex = 0;
            return (
              a +
              (regex.test(b.descr) &&
              negative &&
              !negative.some((keyword) => b.descr.toLowerCase().includes(keyword.toLowerCase()))
                ? 1
                : 0)
            );
          }, 0),
          openings: openings.concat(
            _data.results.filter((opening) => {
              regex.lastIndex = 0;
              if (negative && negative.some((keyword) => opening.descr.toLowerCase().includes(keyword.toLowerCase()))) {
                return false;
              }
              return regex.test(opening.descr);
            })
          ),
        };
      })
      .sort((a, b) => b.count - a.count)
      .filter((keyword) => keyword.count > 0)
      .slice(0, slice);
    return _keywords;
  }

  function updateCategories() {
    _languages = matchAll(languages, true);
    let filtered = _languages.find((item) => {
      return params_languages?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _frameworks = matchAll(frameworks, true);
    filtered = _frameworks.find((item) => {
      return params_frameworks?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _databases = matchAll(databases, true);
    filtered = _databases.find((item) => {
      return params_databases?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _cloud = matchAll(cloud, true);
    filtered = _cloud.find((item) => {
      return params_cloud?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _devops = matchAll(devops, true);
    filtered = _devops.find((item) => {
      return params_devops?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _softSkills = matchAll(softSkills, false);
    filtered = _softSkills.find((item) => {
      return params_softSkills?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _positions = matchAll(positions, false);
    filtered = _positions.find((item) => {
      return params_positions?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _seniority = matchAll(seniorities, true);
    filtered = _seniority.find((item) => {
      return params_seniorities?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;

    _dataScience = matchAll(dataScience, true);
    filtered = _dataScience.find((item) => {
      return params_dataScience?.includes(item.label.toLowerCase());
    });
    _data.results = filtered?.openings ?? _data.results;
  }

  updateCategories();
  updateCategories();

  // get location_name and count
  const locationCounts = _data.results.reduce((acc: { [key: string]: number }, result) => {
    acc[result.municipality_name] = (acc[result.municipality_name] || 0) + 1;
    return acc;
  }, {});
  // sort locationCounts by count
  const sortedLocationsArray = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
    .slice(0, 30);

  // get company_name and count
  const companyCounts = _data.results.reduce((acc: { [key: string]: number }, result) => {
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
          <h1>Job Listings ({_data.results.length})</h1>

          <h3 className={"text-sm sm:text-2xl line-clamp-4"}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
        </div>

        <div className={"flex flex-col sm:flex-row gap-8 pt-4 sm:justify-between"}>
          <div>
            <h2>Languages</h2>
            <Skills skills={_languages!} />
          </div>

          <div>
            <h2>Frameworks</h2>
            <Skills skills={_frameworks!} />
          </div>

          <div>
            <h2>Databases</h2>
            <Skills skills={_databases!} />
          </div>

          <div>
            <h2>Cloud</h2>
            <Skills skills={_cloud!} />
          </div>

          <div>
            <h2>DevOps</h2>
            <Skills skills={_devops!} />
          </div>

          <div>
            <h2>Soft Skills</h2>
            <Skills skills={_softSkills!} />
          </div>
        </div>
        <div></div>
      </div>
      <div>
        <div className={"flex flex-col sm:flex-row gap-8 pt-8 justify-between"}>
          <div className={"sm:max-w-[25%]"}>
            <h2>Top 30 Companies</h2>
            <ul>
              {sortedCompaniesArray.map((company) => {
                return (
                  <li key={company.label} className={"flex flex-row"}>
                    ({company.count})&nbsp;<span className={"max-w-full line-clamp-1"}>{company.label}</span>
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
                  <li key={location.label} className={"flex flex-row"}>
                    ({location.count})&nbsp;<span className={"max-w-full line-clamp-1"}>{location.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2>Role</h2>
            <Skills skills={_positions!} />
          </div>
          <div>
            <h2>Seniority</h2>
            <Skills skills={_seniority!} />
          </div>
          <div>
            <h2>Data Science</h2>
            <Skills skills={_dataScience!} />
          </div>
        </div>
      </div>
      <div className={"py-8"}>
        <h1 className={"pb-4"}>Filtered Job Listings ({_data.results.length < 30 ? _data.results.length : 30})</h1>
        {_data.results.slice(0, 30).map((result: Results) => (
          <div key={result.slug}>
            <a href={`https://duunitori.fi/tyopaikat/tyo/${result.slug}`} className={"text-xl font-bold"}>
              {result.heading}
            </a>
            <p className={"text-gray-200"}>
              {result.company_name} - {result.municipality_name}
            </p>
            <p className={"text-sm text-gray-400"}>
              {new Date(result.date_posted).toLocaleDateString("fi-FI")} -{" "}
              {new Date(result.date_posted).toLocaleTimeString("fi-FI", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {/* toggle desc with html dropdown readmore */}
            <details>
              <summary className={"line-clamp-1 text-sm text-gray-400 tracking-wider"}>{result.descr}</summary>
              <p className={"text-sm text-gray-400 tracking-wider"}>{result.descr}</p>
            </details>
            <hr className={"my-4 border-gray-400"} />
          </div>
        ))}
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
