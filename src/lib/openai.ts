// src/lib/openai.ts
import 'server-only'
import OpenAI from 'openai'

// Lazy singleton client
let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (_client) return _client

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment')
  }

  _client = new OpenAI({ apiKey })
  return _client
}

// ---------------------------------------------
// Generic helper for Chat Completion
// ---------------------------------------------
export async function getOpenAIResponse(
  prompt: string,
  opts?: {
    model?: string
    system?: string
  }
): Promise<string> {
  const client = getClient()

  const {
    model = 'gpt-4o-nano',
    system = 'You are a concise assistant.',
  } = opts ?? {}

  try {
    const chat = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    })

    const text = chat.choices?.[0]?.message?.content?.trim() ?? ''
    return text
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${error.message}`)
  }
}

// ---------------------------------------------
// Specialized helper: Working Mode Classifier
// ---------------------------------------------
export type WorkingMode = 'remote' | 'onsite' | 'hybrid' | 'unknown'

const SYSTEM_PROMPT = `
You are a strict work-arrangement classifier.

Task: From a single job posting (free text or JSON), output exactly one lowercase word: remote | onsite | hybrid | unknown.

Decision rules (English & Finnish signals):
1) Explicit phrasing wins.
   - remote: "remote", "fully remote", "work from home", "telecommute"; FI: "etätyö", "täysin etä", "etänä".
   - hybrid: "hybrid", "X days in office", "partially remote"; FI: "hybridi", "hybridimalli", "osittainen etätyö", "ajoittaista läsnäoloa".
   - onsite: "on-site"/"onsite", "office-based", "site/factory/warehouse based"; FI: "lähityö", "paikan päällä", "toimistolla", "työmaalla", "kenttätyö".
2) Required/regular office presence ⇒ hybrid. Optional office access only ⇒ remote.
3) Travel does not change the label.
4) City/address alone does not imply onsite.
5) Vague flexibility ⇒ unknown.
6) Conflicts: both remote + required onsite ⇒ hybrid; otherwise prefer explicit over generic.
7) Default to unknown.

Parse across all fields; normalize variants/misspellings. Output only the single word with no punctuation or extras.
`.trim()

function truncate(s: string, max = 8000) {
  return s.length > max ? s.slice(0, max) : s
}

export async function getWorkingMode(
  jobDescription: string,
  jobTitle: string
): Promise<WorkingMode> {
  const prompt = [
    'Classify the working mode. Answer with one word only: remote|onsite|hybrid|unknown.',    `Title: ${jobTitle ?? ''}`,
    `Text: ${truncate(jobDescription ?? '')}`,
  ].join('\n')

  const response = await getOpenAIResponse(prompt, {
    model: 'gpt-5-mini',
    system: SYSTEM_PROMPT,
  })

  const cleaned = String(response).toLowerCase().trim()

  const validModes: WorkingMode[] = ['remote', 'onsite', 'hybrid', 'unknown']

  // Prefer exact match
  if (validModes.includes(cleaned as WorkingMode)) {
    return cleaned as WorkingMode
  }

  // Fallback: extract the first valid token if extra text slipped through
  const match = cleaned.match(/\b(remote|onsite|hybrid|unknown)\b/)
  console.log(`Classified work_mode: "${response}" -> "${match ? match[1] : 'unknown'}"`)
  return (match ? (match[1] as WorkingMode) : 'unknown')
}

export type { OpenAI }
