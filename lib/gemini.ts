import { GoogleGenAI } from '@google/genai'
import { Brief, Mood, PreferencesInput } from './types'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    genres: {
      type: 'array',
      items: { type: 'string' },
      description: 'TMDB-style genre names both partners would enjoy, e.g. "Comedy", "Thriller"',
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short thematic keywords/tone descriptors to search by, e.g. "heist", "slow burn", "found family"',
    },
    tone: {
      type: 'string',
      description: 'One sentence describing the shared tone/mood to aim for tonight',
    },
    rationale: {
      type: 'string',
      description: 'One sentence on how you reconciled the two preference profiles',
    },
  },
  required: ['genres', 'keywords', 'tone', 'rationale'],
}

interface PartnerInput {
  role: 'A' | 'B'
  preferences: PreferencesInput
}

interface BriefContext {
  pastLikes?: string[]
  roundHint?: string
}

const MOOD_LABELS: Record<Mood, string> = {
  light_fun: 'Light & fun',
  intense_gripping: 'Intense & gripping',
  scary: 'Scary',
  romantic: 'Romantic',
  other: 'Other',
}

function describeMood(mood: Mood[]): string {
  return mood.map((m) => MOOD_LABELS[m]).join(', ') || 'no strong preference'
}

function buildPrompt(partners: PartnerInput[], context: BriefContext): string {
  const lines = partners.map(
    (p) =>
      `Partner ${p.role}: mood = ${describeMood(p.preferences.mood)}; free-text mood = "${
        p.preferences.moodText || 'none given'
      }"; languages = ${p.preferences.languages.join(', ') || 'any'}; content type = ${
        p.preferences.contentType
      }; min rating = ${p.preferences.minRating}; era = ${p.preferences.eras.join(', ') || 'any'}`
  )

  let prompt =
    'Two partners are picking something to watch together tonight in India. Merge their preferences into ' +
    "a shared search brief that would satisfy both of them, paying special attention to blending their " +
    "free-text mood descriptions rather than just their checkbox moods — that's where the real nuance is.\n\n" +
    lines.join('\n')

  if (context.pastLikes && context.pastLikes.length > 0) {
    prompt += `\n\nThey've previously enjoyed watching together: ${context.pastLikes.join(', ')}. Let this inform the brief without ignoring what they've asked for tonight.`
  }
  if (context.roundHint) {
    prompt += `\n\n${context.roundHint}`
  }
  prompt += '\n\nRespond with the merged brief as JSON matching the given schema.'
  return prompt
}

export async function generateBrief(partners: PartnerInput[], context: BriefContext = {}): Promise<Brief> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: buildPrompt(partners, context),
    config: {
      responseMimeType: 'application/json',
      responseSchema: BRIEF_SCHEMA as any,
    },
  })

  const text = response.text
  if (!text) throw new Error('Gemini did not return a structured brief')
  return JSON.parse(text) as Brief
}
