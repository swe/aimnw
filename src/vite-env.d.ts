/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_DRINKS: string
  readonly API_LIBRARY: string
  readonly API_MAP: string
  readonly API_GOALS: string
  readonly API_HATES: string
  readonly API_PHOTOS: string
  readonly API_QUESTS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
