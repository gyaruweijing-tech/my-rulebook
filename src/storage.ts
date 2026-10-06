import type { Rule } from './types'

const KEY = 'my-rulebook-v1'

// 旧版（別のリポジトリ名で公開していた頃）の保存データを、初回だけ引き継ぐ。
// 同じ github.io の中なら localStorage は共有される。旧キーの名前はコードに書かず、末尾で探す
function migrateOldKey() {
  if (localStorage.getItem(KEY)) return
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k !== KEY && k.endsWith('-rulebook-v1')) {
      const v = localStorage.getItem(k)
      if (v) localStorage.setItem(KEY, v)
      return
    }
  }
}

export function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// 初期データは空。ルールは全部アプリ内で刻む（コードに個人の価値観を書かない）
const seedRules: Rule[] = []

export function loadRules(): Rule[] {
  try {
    migrateOldKey()
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedRules
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedRules
    return parsed as Rule[]
  } catch {
    return seedRules
  }
}

export function saveRules(rules: Rule[]) {
  localStorage.setItem(KEY, JSON.stringify(rules))
}

// 「今日の1本」: 日付をシードにしたランダム。同じ日は同じルールが出る
export function pickToday(rules: Rule[]): Rule | null {
  if (rules.length === 0) return null
  const seed = todayStr()
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return rules[h % rules.length]
}

function ruleLines(r: Rule, index?: number): string[] {
  const lines: string[] = []
  const title = index !== undefined ? `### ${index + 1}. ${r.text}` : `### ${r.text}`
  lines.push(title, '')
  if (r.origin) lines.push(`> ${r.origin}`, '')
  const dates =
    r.updatedAt !== r.createdAt
      ? `制定日: ${r.createdAt} / 改定日: ${r.updatedAt}`
      : `制定日: ${r.createdAt}`
  lines.push(`- カテゴリ: ${r.category || 'なし'}`, `- ${dates}`)
  if (r.status === 'sotsugyo') {
    lines.push(`- 卒業日: ${r.graduatedAt ?? '不明'}`)
    if (r.graduationReason) lines.push(`- 卒業理由: ${r.graduationReason}`)
  }
  lines.push('')
  return lines
}

export function exportMarkdown(rules: Rule[]): string {
  const sanka = rules.filter((r) => r.status === 'sanka')
  const kokoroe = rules.filter((r) => r.status === 'kokoroe')
  const sotsugyo = rules.filter((r) => r.status === 'sotsugyo')
  const lines: string[] = ['# ワニのルールブック', '', `最終更新: ${todayStr()}`, '']

  lines.push('## 三箇条', '')
  if (sanka.length === 0) lines.push('（まだ空位）', '')
  sanka.forEach((r, i) => lines.push(...ruleLines(r, i)))

  lines.push('## 心得', '')
  if (kokoroe.length === 0) lines.push('（まだなし）', '')
  kokoroe.forEach((r) => lines.push(...ruleLines(r)))

  if (sotsugyo.length > 0) {
    lines.push('## 卒業したルール', '')
    sotsugyo.forEach((r) => lines.push(...ruleLines(r)))
  }

  return lines.join('\n')
}

export function exportJson(rules: Rule[]): string {
  return JSON.stringify(rules, null, 2)
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
