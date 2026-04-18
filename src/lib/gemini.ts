import "server-only";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { selectGeminiModel } from "@/lib/gemini-models";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

const SYSTEM_INSTRUCTION = `System Instructions:
You are an expert technical recruiter and data extraction AI. Your task is to analyze provided job descriptions and extract relevant keywords into 13 predefined categories.

Extraction & Semantic Mapping Rules:

    Intelligent Mapping: You are provided with a "Reference Taxonomy" below. Use your semantic understanding to map abbreviations (e.g., "JS"), variations (e.g., "front-end"), or translations (e.g., "koodari", "ohjelmistokehittäjä") found in the text to the exact standard labels provided in the taxonomy.

    Exact String Output: When you map a concept to the taxonomy, you MUST output the exact string exactly as it is written in the taxonomy list (e.g., output "JavaScript", not "JS" or "Javascriptiä").

    Contextual Awareness: Rely on the surrounding context. Do not confuse executive levels (e.g., "C-level") with programming languages ("C"). Do not extract technologies or traits used merely to describe the hiring company's products or general IT infrastructure. Extract only what is required of the candidate.

    Roles Category (CRITICAL): You MUST extract the primary job title being advertised. Heavily weigh the "Title:" field provided in the input prompt. Map the job title (and any specific past titles explicitly required) to the closest matching label in the Roles taxonomy. Use semantic mapping for localized or creative titles (e.g., map "ICT-suunnittelija" to "Systems Architect", or "Koodari" to "Software Developer"). DO NOT extract daily responsibilities (like "project management") as job roles.

    Explicit Tech Mentions (Anti-Hallucination): For technical categories (Languages, Frameworks, Databases, Cloud, DevOps, Data Science), the core technology MUST BE EXPLICITLY NAMED in the text. DO NOT guess underlying tech (e.g., do not infer "SQL" just because you see "Relational Databases").

    Domain Separation: Strictly differentiate between human soft skills and technical domains. Do not map behavioral traits (e.g., "analytical") to technical tools or data science concepts.

    Strict Rule for Soft Skills: For softSkills, you MUST adhere strictly to the Reference Taxonomy. If a soft skill in the text cannot be semantically mapped directly to an existing term in the list, IGNORE IT.

    Work Mode vs. Cloud: Terms relating to remote, hybrid, or on-site working conditions (e.g., #LI-Hybrid, "hybrid work") refer EXCLUSIVELY to the workMode category. DO NOT map working conditions to "Hybrid Cloud".

    Allow Novel Keywords (Technical Only): If you find a highly relevant technical framework, tool, or language explicitly named in the text that is NOT in the taxonomy, extract it and format it in Title Case. (Do not invent soft skills or locations).

    Extract Origin: For every extracted keyword, you must also provide the origin—the exact snippet or sentence from the text that proves the keyword applies.

Reference Taxonomy:
Languages: JavaScript, TypeScript, Python, Java, C#, PHP, Ruby, C++, C, Golang, Rust, Scala, Kotlin, Swift, Objective-C, Perl, Haskell, Clojure, Erlang, Elixir, Dart, Lua, R, Bash, PowerShell, Assembly, MATLAB, Visual Basic, COBOL, Fortran, Lisp, Pascal, Delphi, LabVIEW, Ada, PL/SQL, Prolog, SQL, HTML, CSS, JSON, YAML, Julia, Groovy, ABAP, Apex, Solidity, WebAssembly, Zig, Nim
Frameworks: Node, React, NextJS, Remix, SolidJS, Astro, Qwik, Preact, Vue, Nuxt, Angular, Svelte, Gatsby, Ember, Express, NestJS, Koa, Hapi, Fastify, tRPC, Redux, MobX, Zustand, RxJS, Electron, Flutter, React Native, Ionic, Bootstrap, Tailwind, Material UI, Chakra UI, Framer Motion, Jquery, Django, Flask, FastAPI, Tornado, Ruby on Rails, Laravel, Symfony, CodeIgniter, Yii, CakePHP, Spring, Hibernate, Micronaut, Quarkus, Struts, Play Framework, Ktor, ASP.NET, .NET, TensorFlow, PyTorch, Keras, scikit-learn, XGBoost, LightGBM, CatBoost, OpenCV, spaCy, Hugging Face, JAX, LangChain, LlamaIndex, Pandas, NumPy, Apache Spark, Hadoop, Airflow, dbt, Kafka, Flink, Beam, WordPress, Shopify, WooCommerce, Jupyter Notebook, ROS, Unity, Unreal Engine, Jest, Mocha, Cypress, Playwright, Selenium, JUnit, pytest, RSpec, PHPUnit, Cucumber
Databases: Relational databases, NoSQL databases, Vector databases, PostgreSQL, MySQL, Microsoft SQL Server, Oracle Database, SQLite, MariaDB, Amazon Aurora, MongoDB, DynamoDB, Redis, Cassandra, Couchbase, Elasticsearch, OpenSearch, Neo4j, Pinecone, Weaviate, Milvus, Qdrant, Chroma, Snowflake, Google BigQuery, Amazon Redshift, ClickHouse, TimescaleDB, InfluxDB, QuestDB, JanusGraph, CockroachDB, TiDB
Cloud: AWS, Azure, Google Cloud, Firebase, Cloudflare, Vercel, Netlify, Heroku, Digital Ocean, Linode, Rackspace, IBM Cloud, Alibaba Cloud, Oracle Cloud, VMware Cloud, Red Hat OpenShift, Salesforce Cloud, SAP Cloud, Public cloud, Private cloud, Hybrid cloud, Cloud, Serverless
DevOps: Git, GitHub, GitLab, Bitbucket, Jenkins, CircleCI, Travis CI, Azure DevOps, Argo CD, Spinnaker, Harness, Terraform, Pulumi, AWS CloudFormation, Ansible, Chef, Puppet, Vagrant, Helm, Docker, Kubernetes, Istio, Linkerd, Consul, Prometheus, Grafana, Loki, OpenTelemetry, Datadog, New Relic, Sentry, PagerDuty, Opsgenie, Elasticsearch, Logstash, Kibana, Splunk, Graylog, Nginx, Apache HTTPD, SonarQube, Artifactory, Nexus Repository, Packer, Agile, Scrum, Kanban, CI/CD, DevOps, Pipeline, Taiga, Jira, Confluence, Slack, Trello, Maven, Gradle, Bazel, Nx, Turborepo
Data Science: Machine Learning, Deep Learning, Reinforcement learning, Big Data, Data Analysis, Data Visualization, Data Engineering, Natural Language Processing, Computer Vision, Statistics, Business Intelligence, Data Warehousing, Data Modeling, Data Mining, Data Management, Artificial Intelligence, scikit-learn, Pytorch, TensorFlow, Keras, XGBoost, LightGBM, CatBoost, Hugging Face, LangChain, LlamaIndex, RAG, OpenCV, spaCy, MLflow, Kubeflow, Vertex AI, SageMaker, Pandas, NumPy
Cyber Security: Cyber Security, Application Security, SOC, Blue Team, Red Team, Purple Team, Penetration Testing, Vulnerability Management, Threat Hunting, Threat Intelligence, Incident Response, Digital Forensics, Reverse Engineering, Security Architecture, IAM, Zero Trust, SIEM, SOAR, IDS, IPS, Firewall, OWASP, NIST, ISO 27001, PCI-DSS, GDPR, SOC2, Risk Management, Security Audit, Security Compliance, Security Monitoring, Endpoint Security, CrowdStrike, SentinelOne, Microsoft Defender, Security Hardening, Encryption, Cryptography, PKI, Key Management, Burp Suite, Nmap, Metasploit, Wireshark, Kali Linux, OSINT, MITRE ATT&CK, CVE, CVSS, SAST, DAST, IAST, RASP, Secret Scanning, Dependency Scanning, Container Security, Supply Chain Security, Security Champion, Secure SDLC
Soft Skills: Communication, Teamwork, Problem Solving, Innovation, Time management, Adaptability, Flexibility, Leadership, Mentoring, Ownership, Documentation, Presentation, Stakeholder management, Negotiation, People skills, Work ethic, Dedication, Reliability, Optimism, Customer Service, Motivation, Empathy, Patience, Accountability, Self-directed, Curiosity, Pressure Tolerance, Feedback
Roles: Full Stack, Front End, Back End, Consultant, Software Developer, Software Architect, Cloud Architect, Systems Architect, Web Developer, Mobile Developer, Platform Engineer, Site Reliability Engineer, DevOps Engineer, Data Engineer, Data Scientist, Data Analyst, Business Intelligence Developer, Machine Learning Engineer, MLOps Engineer, Cloud Engineer, Embedded, Cyber Security, Security specialist, Penetration Tester, Network Engineer, QA Engineer, Test Automation, UX Designer, UI Designer, Product Designer, Designer, System Administrator, System Specialist, Product Manager, Project Manager, Business Analyst, Scrum Master, AI Engineer, Blockchain Engineer, Game Developer, Game Designer, Teacher / Professor, Researcher, Salesman, Technical Support, Integration Manager
Seniority: Intern, Junior, Mid-level, Senior, Lead, Director, Vice President, Chief
Location: Helsinki, Espoo, Tampere, Vantaa, Oulu, Turku, Jyväskylä, Lahti, Kuopio, Kouvola, Pori, Joensuu, Lappeenranta, Hämeenlinna, Vaasa, Rovaniemi, Seinäjoki, Mikkeli, Kotka, Salo, Porvoo, Kokkola, Lohja, Hyvinkää, Nurmijärvi, Järvenpää, Rauma, Kirkkonummi, Tuusula, Kajaani, Kalajoki, Kemi, Riihimäki, Savonlinna, Kaarina, Kerava, Ylöjärvi, Imatra, Sastamala, Finland, Sweden, Norway, Germany, Estonia, Spain, Greece, Stockholm, Gothenburg, Malmö, Oslo, Copenhagen, Amsterdam, Kyiv, London, Berlin, Munich, Tallinn, Netherlands, Ukraine, United Kingdom, United States`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: [
    "languages",
    "frameworks",
    "databases",
    "cloud",
    "devOps",
    "cyberSecurity",
    "dataScience",
    "roles",
    "seniority",
    "softSkills",
    "locations",
    "workMode",
    "salary",
  ],
  properties: {
    languages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    frameworks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    databases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    cloud: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    devOps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    cyberSecurity: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    dataScience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    roles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    seniority: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    softSkills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    workMode: {
      type: Type.ARRAY,
      description: "Strictly 'On-site', 'Hybrid', or 'Remote'.",
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
    salary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["keyword", "origin"],
        properties: {
          keyword: { type: Type.STRING },
          origin: { type: Type.STRING },
        },
      },
    },
  },
};


export interface AiKeywordResult {
  keyword: string;
  origin: string;
}

export interface AiClassificationResult {
  languages: AiKeywordResult[];
  frameworks: AiKeywordResult[];
  databases: AiKeywordResult[];
  cloud: AiKeywordResult[];
  devOps: AiKeywordResult[];
  cyberSecurity: AiKeywordResult[];
  dataScience: AiKeywordResult[];
  roles: AiKeywordResult[];
  seniority: AiKeywordResult[];
  softSkills: AiKeywordResult[];
  locations: AiKeywordResult[];
  workMode: AiKeywordResult[];
  salary: AiKeywordResult[];
}

// Maps Gemini response categories to database category names
const CATEGORY_DB_MAP: Record<string, string> = {
  languages: "languages",
  frameworks: "frameworks",
  databases: "databases",
  cloud: "cloud",
  devOps: "devops",
  cyberSecurity: "cyberSecurity",
  dataScience: "dataScience",
  roles: "positions",
  seniority: "seniority",
  softSkills: "softSkills",
  locations: "locations",
  workMode: "workMode",
  salary: "salary",
};

function truncate(s: string, max = 12000) {
  return s.length > max ? s.slice(0, max) : s;
}

export async function classifyJobWithAI(
  jobTitle: string,
  jobDescription: string,
): Promise<AiClassificationResult> {
  const client = getClient();

  const prompt = `Please extract the job data from the following description:

Title: ${jobTitle || ""}

Description:
${truncate(jobDescription || "")}`;

  const response = await client.models.generateContent({
    model: selectGeminiModel("classification"),
    contents: prompt,
    config: {
      systemInstruction: [{ text: SYSTEM_INSTRUCTION }],
      temperature: 0.3,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  return JSON.parse(text) as AiClassificationResult;
}

/**
 * Flatten AI classification result into DB-ready rows
 */
export function flattenAiResult(
  result: AiClassificationResult,
): { category: string; keyword: string; origin: string }[] {
  const rows: { category: string; keyword: string; origin: string }[] = [];

  for (const [geminiKey, dbCategory] of Object.entries(CATEGORY_DB_MAP)) {
    const items = result[geminiKey as keyof AiClassificationResult];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      rows.push({
        category: dbCategory,
        keyword: item.keyword,
        origin: item.origin,
      });
    }
  }

  return rows;
}
