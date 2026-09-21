import fs from 'fs'
import path from 'path'
import { parseYaraSource, type YaraRule } from './parser'
import { compileStringDef, findMatchedIds, evalCondition, type CompiledString } from './match'

export type YaraSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface YaraMatch {
  rule: string
  description: string
  severity: YaraSeverity
  tags: string[]
  matchedStrings: string[]
}

const SEVERITY_ORDER: YaraSeverity[] = ['info', 'low', 'medium', 'high', 'critical']

export function severityRank(sev: string): number {
  const i = SEVERITY_ORDER.indexOf(sev as YaraSeverity)
  return i === -1 ? SEVERITY_ORDER.indexOf('medium') : i
}

interface CompiledRule {
  rule: YaraRule
  compiled: CompiledString[]
  allIds: string[]
}

let cache: CompiledRule[] | null = null

// 20 MB is comfortably inside a Vercel serverless function's memory/time
// budget for the regex-based scan below; larger uploads skip rule matching
// rather than risk a timeout.
export const MAX_YARA_SCAN_BYTES = 20 * 1024 * 1024

function loadRules(): CompiledRule[] {
  if (cache) return cache

  const rulesDir = path.join(process.cwd(), 'rules')
  let files: string[] = []
  try {
    files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.yar') || f.endsWith('.yara'))
  } catch {
    cache = []
    return cache
  }

  const compiled: CompiledRule[] = []
  for (const file of files) {
    const source = fs.readFileSync(path.join(rulesDir, file), 'utf-8')
    let rules: YaraRule[] = []
    try {
      rules = parseYaraSource(source)
    } catch (e) {
      console.error(`Failed to parse YARA rules in ${file}:`, e)
      continue
    }
    for (const rule of rules) {
      const allIds = rule.strings.map(s => s.id)
      const compiledStrings = rule.strings.map(compileStringDef)
      compiled.push({ rule, compiled: compiledStrings, allIds })
    }
  }

  cache = compiled
  return compiled
}

export function scanBufferWithYara(buffer: Buffer): YaraMatch[] {
  const rules = loadRules()
  if (rules.length === 0) return []
  if (buffer.length > MAX_YARA_SCAN_BYTES) return []

  const haystack = buffer.toString('latin1')
  const matches: YaraMatch[] = []

  for (const { rule, compiled, allIds } of rules) {
    const matchedIds = compiled.length > 0 ? findMatchedIds(haystack, compiled) : new Set<string>()
    let hit = false
    try {
      hit = evalCondition(rule.condition, matchedIds, allIds, buffer.length)
    } catch (e) {
      console.error(`Failed to evaluate condition for rule "${rule.name}":`, e)
      continue
    }
    if (!hit) continue

    matches.push({
      rule: rule.name,
      description: typeof rule.meta.description === 'string' ? rule.meta.description : 'No description provided.',
      severity: (typeof rule.meta.severity === 'string' ? rule.meta.severity : 'medium') as YaraSeverity,
      tags: rule.tags,
      matchedStrings: [...matchedIds],
    })
  }

  return matches.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}
