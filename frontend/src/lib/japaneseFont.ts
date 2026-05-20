import { useEffect, useState } from 'react'
import api from './api'

export type JapaneseFont = 'zen_maru_gothic' | 'noto_sans_jp' | 'klee_one'

const FONT_LABELS: Record<JapaneseFont, string> = {
  zen_maru_gothic: 'Zen Maru Gothic',
  noto_sans_jp:    'Noto Sans JP',
  klee_one:        'Klee One (handwritten)'
}

const FONT_DESCRIPTIONS: Record<JapaneseFont, string> = {
  zen_maru_gothic: 'Rounded and friendly. KaniCompanion default.',
  noto_sans_jp:    'Clean and neutral. Looks like most Japanese websites.',
  klee_one:        'Handwritten style. Great for practicing natural handwriting recognition.'
}

export const JAPANESE_FONTS: JapaneseFont[] = ['zen_maru_gothic', 'noto_sans_jp', 'klee_one']

export function fontLabel(font: JapaneseFont): string {
  return FONT_LABELS[font]
}

export function fontDescription(font: JapaneseFont): string {
  return FONT_DESCRIPTIONS[font]
}

export function fontClassName(font: JapaneseFont | undefined): string {
  if (!font) return 'ja-font-zen_maru_gothic'
  return `ja-font-${font}`
}

/**
 * Hook that fetches the user's font preference from settings and returns
 * the className to apply to Japanese-text elements.
 *
 * Usage in a component:
 *   const jaFontClass = useJapaneseFont()
 *   return <div className={`text-6xl ${jaFontClass}`}>{kanji}</div>
 */
export function useJapaneseFont(): string {
  const [font, setFont] = useState<JapaneseFont>('zen_maru_gothic')

  useEffect(() => {
    api.get('/practice_setting')
      .then((r) => {
        const value = r.data?.japanese_font as JapaneseFont | undefined
        if (value && JAPANESE_FONTS.includes(value)) {
          setFont(value)
        }
      })
      .catch(() => {
        // Fall back to default — not worth a toast for a font preference
      })
  }, [])

  return fontClassName(font)
}
