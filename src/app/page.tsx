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
  let data = await fetch(
    "https://duunitori.fi/api/v1/jobentries?format=json&search=Tieto-+ja+tietoliikennetekniikka%28ala%29"
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
  const dataScience = [
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
  const _dataScience = matchAll(dataScience, true);

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
            <Skills skills={_languages} data={_data} />
          </div>

          <div>
            <h2>Frameworks</h2>
            <Skills skills={_frameworks} data={_data} />
          </div>

          <div>
            <h2>Databases</h2>
            <Skills skills={_databases} data={_data} />
          </div>

          <div>
            <h2>Cloud</h2>
            <Skills skills={_cloud} data={_data} />
          </div>

          <div>
            <h2>DevOps</h2>
            <Skills skills={_devops} data={_data} />
          </div>

          <div>
            <h2>Soft Skills</h2>
            <Skills skills={_softSkills} data={_data} />
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
            <Skills skills={sortedLocationsArray} data={_data} />
          </div>
          <div>
            <h2>Role</h2>
            <Skills skills={_positions} data={_data} />
          </div>
          <div>
            <h2>Seniority</h2>
            <Skills skills={_seniority} data={_data} />
          </div>
          <div>
            <h2>Data Science</h2>
            <Skills skills={_dataScience} data={_data} />
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
