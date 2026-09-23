export type Mood = 'light_fun' | 'intense_gripping' | 'scary' | 'romantic' | 'other'
export type Language = 'hindi' | 'english' | 'tamil' | 'telugu' | 'kannada' | 'any'
export type ContentType = 'movies_only' | 'include_series'
export type MinRating = 6 | 7 | 8 | 9
export type Era = 'any' | 'classic' | '2000_2020' | 'recent'
export type ParticipantRole = 'A' | 'B'
export type SwipeDirection = 'like' | 'pass'
export type MediaType = 'movie' | 'tv'

export type SessionStatus =
  | 'waiting_for_partner'
  | 'collecting_prefs'
  | 'generating'
  | 'swiping_round_1'
  | 'swiping_round_2'
  | 'final_pick'
  | 'matched'
  | 'completed'

export interface PreferencesInput {
  mood: Mood[]
  moodText: string
  languages: Language[]
  contentType: ContentType
  minRating: MinRating
  eras: Era[]
}

export interface OttPlatform {
  name: string
  link: string
}

export interface TitleCard {
  tmdbId: number
  mediaType: MediaType
  imdbId: string | null
  title: string
  year: number | null
  posterUrl: string | null
  imdbRating: number | null
  runtimeMinutes: number | null
  overview: string
  genres: string[]
  ottPlatforms: OttPlatform[]
}

export interface Brief {
  genres: string[]
  keywords: string[]
  tone: string
  rationale: string
}

export interface MergedFilters {
  languages: string[]
  contentType: ContentType
  minRating: number
  eras: Era[]
}
