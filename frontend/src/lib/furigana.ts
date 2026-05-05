// Wraps kuroshiro to convert Japanese text into HTML with <ruby> tags for furigana.
// Used for Tatoeba sentences which don't come with reading data — we generate
// furigana on the fly in the browser using the kuroshiro library + an analyzer.
//
// This module lazy-loads kuroshiro because:
//   - It's ~2MB
//   - Only sentence practice needs it
//   - First call to convert() will download/initialize, subsequent calls are instant
//
// Note: kuroshiro's auto-generated furigana isn't perfect — uncommon names,
// rare readings, and some compounds may be wrong. The session UI shows a small
// disclaimer when source === 'tatoeba'.

interface KuroshiroInstance {
  init: (analyzer: unknown) => Promise<void>
  convert: (text: string, options: Record<string, unknown>) => Promise<string>
}

let kuroshiroInstance: KuroshiroInstance | null = null
let initPromise: Promise<KuroshiroInstance> | null = null

async function getKuroshiro(): Promise<KuroshiroInstance> {
  if (kuroshiroInstance) return kuroshiroInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const KuroshiroModule = await import('kuroshiro')
    const KuromojiAnalyzerModule = await import('kuroshiro-analyzer-kuromoji')

    const Kuroshiro = (KuroshiroModule as unknown as { default: new () => KuroshiroInstance }).default
    const KuromojiAnalyzer = (KuromojiAnalyzerModule as unknown as { default: new (options?: { dictPath?: string }) => unknown }).default

    const k = new Kuroshiro()
    // Kuromoji dictionary is served from the CDN; we point at a public mirror to avoid bundling 12MB
    const analyzer = new KuromojiAnalyzer({
      dictPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/',
    })
    await k.init(analyzer)
    kuroshiroInstance = k
    return k
  })()

  return initPromise
}

export interface FuriganaOptions {
  showFurigana: boolean
}

/**
 * Converts Japanese text to HTML with optional ruby (furigana) markup.
 * Returns plain HTML string (caller should use dangerouslySetInnerHTML).
 *
 * If showFurigana is false, returns plain text (escaped HTML).
 */
export async function renderJapaneseHtml(text: string, options: FuriganaOptions): Promise<string> {
  if (!options.showFurigana) {
    return escapeHtml(text)
  }

  try {
    const k = await getKuroshiro()
    return await k.convert(text, { mode: 'furigana', to: 'hiragana' })
  } catch (err) {
    console.error('[furigana] kuroshiro convert failed:', err)
    return escapeHtml(text)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Synchronously highlights the target word within a sentence by wrapping it in
 * <span class="target-word">…</span>. Works on the raw text BEFORE furigana conversion;
 * use this if you want the highlight without ruby tags.
 */
export function highlightTarget(sentence: string, target: string): string {
  if (!target || !sentence.includes(target)) return escapeHtml(sentence)

  const parts = sentence.split(target)
  return parts.map(escapeHtml).join(`<span class="target-word">${escapeHtml(target)}</span>`)
}
