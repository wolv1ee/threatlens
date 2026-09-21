import type { YaraStringDef, ConditionNode } from './parser'

// Every matcher is compiled down to a RegExp that runs against a "latin1"
// decoding of the file buffer, where each byte maps to exactly one string
// character (code point 0-255). Byte values are always emitted as \xHH
// escapes rather than literal characters, which sidesteps the need to
// regex-escape metacharacters like $ ( ) . * that show up constantly in
// real string/hex indicators.

function hex2(byte: number): string {
  return byte.toString(16).padStart(2, '0')
}

function isAlpha(ch: string): boolean {
  return /[A-Za-z]/.test(ch)
}

function buildTextPattern(def: YaraStringDef): string {
  const pieces: string[] = []
  for (const ch of def.raw) {
    const code = ch.charCodeAt(0) & 0xff
    let piece: string
    if (def.nocase && isAlpha(ch)) {
      const lower = ch.toLowerCase().charCodeAt(0) & 0xff
      const upper = ch.toUpperCase().charCodeAt(0) & 0xff
      piece = lower === upper ? `\\x${hex2(lower)}` : `[\\x${hex2(lower)}\\x${hex2(upper)}]`
    } else {
      piece = `\\x${hex2(code)}`
    }
    pieces.push(piece)
    if (def.wide) pieces.push('\\x00')
  }
  let body = pieces.join('')
  if (def.fullword) body = `(?<![A-Za-z0-9_])${body}(?![A-Za-z0-9_])`
  return body
}

type HexToken = { kind: 'byte'; text: string } | { kind: '(' } | { kind: ')' } | { kind: '|' }

function tokenizeHex(raw: string): HexToken[] {
  const toks: HexToken[] = []
  let i = 0
  while (i < raw.length) {
    const c = raw[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '(') { toks.push({ kind: '(' }); i++; continue }
    if (c === ')') { toks.push({ kind: ')' }); i++; continue }
    if (c === '|') { toks.push({ kind: '|' }); i++; continue }
    let j = i
    while (j < raw.length && !/[\s()|]/.test(raw[j])) j++
    toks.push({ kind: 'byte', text: raw.slice(i, j) })
    i = j
  }
  return toks
}

function byteTokenToRegex(tok: string): string {
  if (tok === '??') return '[\\x00-\\xff]'

  const full = /^[0-9A-Fa-f]{2}$/
  if (full.test(tok)) return `\\x${tok.toLowerCase()}`

  const highWild = /^[0-9A-Fa-f]\?$/ // e.g. "4?"
  if (highWild.test(tok)) {
    const base = parseInt(tok[0], 16) * 16
    return `[\\x${hex2(base)}-\\x${hex2(base + 15)}]`
  }

  const lowWild = /^\?[0-9A-Fa-f]$/ // e.g. "?A"
  if (lowWild.test(tok)) {
    const low = parseInt(tok[1], 16)
    const values: string[] = []
    for (let h = 0; h < 16; h++) values.push(`\\x${hex2(h * 16 + low)}`)
    return `[${values.join('')}]`
  }

  // unsupported token shape - match nothing rather than throw
  return '(?!x)x'
}

// Parses a (possibly nested-parenthesised) hex string body into a regex
// source string. Supports fixed bytes, ?? / nibble wildcards, and single-
// level ( AA BB | CC DD ) alternation groups.
function buildHexPattern(raw: string): string {
  const toks = tokenizeHex(raw)
  let pos = 0

  function parseSeq(stopAtPipeOrParen: boolean): string {
    let out = ''
    while (pos < toks.length) {
      const t = toks[pos]
      if (t.kind === ')' || (stopAtPipeOrParen && t.kind === '|')) break
      if (t.kind === '(') {
        pos++
        out += parseGroup()
      } else if (t.kind === 'byte') {
        out += byteTokenToRegex(t.text)
        pos++
      } else {
        pos++
      }
    }
    return out
  }

  function parseGroup(): string {
    const branches: string[] = [parseSeq(true)]
    while (pos < toks.length && toks[pos].kind === '|') {
      pos++
      branches.push(parseSeq(true))
    }
    if (pos < toks.length && toks[pos].kind === ')') pos++
    return `(?:${branches.join('|')})`
  }

  return parseSeq(false)
}

export interface CompiledString {
  id: string
  regex: RegExp
}

export function compileStringDef(def: YaraStringDef): CompiledString {
  const body = def.kind === 'text' ? buildTextPattern(def) : buildHexPattern(def.raw)
  return { id: def.id, regex: new RegExp(body) }
}

export function findMatchedIds(haystack: string, compiled: CompiledString[]): Set<string> {
  const matched = new Set<string>()
  for (const c of compiled) {
    if (c.regex.test(haystack)) matched.add(c.id)
  }
  return matched
}

function resolveIds(pattern: string[], allIds: string[]): string[] {
  if (pattern.includes('*')) return allIds
  const out = new Set<string>()
  for (const p of pattern) {
    if (p.endsWith('*')) {
      const prefix = p.slice(0, -1)
      for (const id of allIds) if (id.startsWith(prefix)) out.add(id)
    } else {
      out.add(p)
    }
  }
  return [...out]
}

export function evalCondition(
  node: ConditionNode,
  matched: Set<string>,
  allIds: string[],
  filesize: number
): boolean {
  switch (node.type) {
    case 'bool': return node.value
    case 'stringRef': return matched.has(node.id)
    case 'not': return !evalCondition(node.expr, matched, allIds, filesize)
    case 'and': return evalCondition(node.left, matched, allIds, filesize) && evalCondition(node.right, matched, allIds, filesize)
    case 'or': return evalCondition(node.left, matched, allIds, filesize) || evalCondition(node.right, matched, allIds, filesize)
    case 'filesize': {
      const v = node.value
      switch (node.op) {
        case '<': return filesize < v
        case '<=': return filesize <= v
        case '>': return filesize > v
        case '>=': return filesize >= v
        case '==': return filesize === v
        case '!=': return filesize !== v
      }
      return false
    }
    case 'of': {
      const ids = resolveIds(node.ids, allIds)
      if (ids.length === 0) return false
      const count = ids.filter(id => matched.has(id)).length
      if (node.count === 'all') return count === ids.length
      if (node.count === 'any') return count >= 1
      return count >= node.count
    }
  }
}
