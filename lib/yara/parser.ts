// A parser for a practical subset of the YARA rule language.
//
// Rules written against this parser use standard YARA syntax (meta / strings /
// condition blocks, text + hex string patterns, nocase|wide|ascii|fullword
// modifiers, "N of them" style conditions) so they remain portable to real
// `yara`/`yara-python` if you ever want to run them through the reference
// implementation. This file only implements the subset our engine supports;
// see rules/README.md for exactly what that covers.

export type YaraStringKind = 'text' | 'hex'

export interface YaraStringDef {
  id: string // includes the leading "$", e.g. "$a0"
  kind: YaraStringKind
  raw: string // original source, unescaped for text strings
  nocase: boolean
  wide: boolean
  ascii: boolean
  fullword: boolean
}

export type ConditionNode =
  | { type: 'bool'; value: boolean }
  | { type: 'stringRef'; id: string }
  | { type: 'not'; expr: ConditionNode }
  | { type: 'and'; left: ConditionNode; right: ConditionNode }
  | { type: 'or'; left: ConditionNode; right: ConditionNode }
  | { type: 'of'; count: 'all' | 'any' | number; ids: string[] }
  | { type: 'filesize'; op: '<' | '<=' | '>' | '>=' | '==' | '!='; value: number }

export interface YaraRule {
  name: string
  tags: string[]
  meta: Record<string, string | number | boolean>
  strings: YaraStringDef[]
  condition: ConditionNode
}

type TokKind =
  | 'ident' | 'string' | 'hexblock' | 'number'
  | '{' | '}' | '(' | ')' | ':' | '=' | ',' | '*'
  | '<' | '>' | '<=' | '>=' | '==' | '!=' | 'eof'

interface Token {
  kind: TokKind
  value: string
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = src.length

  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c)
  const isIdentChar = (c: string) => /[A-Za-z0-9_]/.test(c)

  while (i < n) {
    const c = src[i]

    // whitespace
    if (/\s/.test(c)) { i++; continue }

    // line comment
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    // block comment
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }

    // quoted string
    if (c === '"') {
      let j = i + 1
      let out = ''
      while (j < n && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < n) {
          const esc = src[j + 1]
          if (esc === 'n') out += '\n'
          else if (esc === 't') out += '\t'
          else if (esc === '"') out += '"'
          else if (esc === '\\') out += '\\'
          else if (esc === 'x' && j + 3 < n) {
            out += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16))
            j += 2
          } else out += esc
          j += 2
        } else {
          out += src[j]
          j++
        }
      }
      tokens.push({ kind: 'string', value: out })
      i = j + 1
      continue
    }

    // hex string block: { ... } appearing as a string value (after "$id =")
    // we only ever tokenize this specially when the parser asks for it, so
    // by default treat { and } as punctuation here.
    if (c === '{') { tokens.push({ kind: '{', value: '{' }); i++; continue }
    if (c === '}') { tokens.push({ kind: '}', value: '}' }); i++; continue }
    if (c === '(') { tokens.push({ kind: '(', value: '(' }); i++; continue }
    if (c === ')') { tokens.push({ kind: ')', value: ')' }); i++; continue }
    if (c === ':') { tokens.push({ kind: ':', value: ':' }); i++; continue }
    if (c === ',') { tokens.push({ kind: ',', value: ',' }); i++; continue }
    if (c === '*') { tokens.push({ kind: '*', value: '*' }); i++; continue }
    if (c === '=') {
      if (src[i + 1] === '=') { tokens.push({ kind: '==', value: '==' }); i += 2; continue }
      tokens.push({ kind: '=', value: '=' }); i++; continue
    }
    if (c === '!' && src[i + 1] === '=') { tokens.push({ kind: '!=', value: '!=' }); i += 2; continue }
    if (c === '<') {
      if (src[i + 1] === '=') { tokens.push({ kind: '<=', value: '<=' }); i += 2; continue }
      tokens.push({ kind: '<', value: '<' }); i++; continue
    }
    if (c === '>') {
      if (src[i + 1] === '=') { tokens.push({ kind: '>=', value: '>=' }); i += 2; continue }
      tokens.push({ kind: '>', value: '>' }); i++; continue
    }

    // identifiers, keywords, and $-prefixed string ids (kept as idents,
    // dollar included in the value)
    if (c === '$' || isIdentStart(c)) {
      let j = i + (c === '$' ? 1 : 0)
      if (c === '$') {
        if (src[j] === '*') { tokens.push({ kind: 'ident', value: '$*' }); i = j + 1; continue }
        while (j < n && isIdentChar(src[j])) j++
        tokens.push({ kind: 'ident', value: src.slice(i, j) })
        i = j
        continue
      }
      while (j < n && isIdentChar(src[j])) j++
      tokens.push({ kind: 'ident', value: src.slice(i, j) })
      i = j
      continue
    }

    // numbers (with optional KB/MB suffix, or hex 0x..)
    if (/[0-9]/.test(c)) {
      let j = i
      if (src[j] === '0' && src[j + 1] === 'x') {
        j += 2
        while (j < n && /[0-9a-fA-F]/.test(src[j])) j++
        tokens.push({ kind: 'number', value: String(parseInt(src.slice(i, j), 16)) })
        i = j
        continue
      }
      while (j < n && /[0-9]/.test(src[j])) j++
      let mult = 1
      if (src.slice(j, j + 2).toUpperCase() === 'KB') { mult = 1024; j += 2 }
      else if (src.slice(j, j + 2).toUpperCase() === 'MB') { mult = 1024 * 1024; j += 2 }
      tokens.push({ kind: 'number', value: String(parseInt(src.slice(i, j), 10) * mult) })
      i = j
      continue
    }

    // unknown character, skip it
    i++
  }

  tokens.push({ kind: 'eof', value: '' })
  return tokens
}

class TokenStream {
  constructor(private toks: Token[], private pos = 0) {}
  peek(offset = 0): Token { return this.toks[Math.min(this.pos + offset, this.toks.length - 1)] }
  next(): Token { return this.toks[this.pos++] ?? this.toks[this.toks.length - 1] }
  expect(kind: TokKind): Token {
    const t = this.next()
    if (t.kind !== kind) throw new Error(`YARA parse error: expected ${kind}, got ${t.kind} ("${t.value}")`)
    return t
  }
  atEnd(): boolean { return this.peek().kind === 'eof' }
  savepoint(): number { return this.pos }
  restore(p: number) { this.pos = p }
}

// Hex string bodies ("{ 4D 5A ?? ?? }") are re-lexed from raw source text
// because their tokens (hex bytes, ??, nibble wildcards) don't fit the
// general tokenizer above. We locate the matching "}" by brace depth.
function readHexBlock(src: string, openBraceIndex: number): { body: string; end: number } {
  let depth = 1
  let j = openBraceIndex + 1
  while (j < src.length && depth > 0) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') depth--
    if (depth === 0) break
    j++
  }
  return { body: src.slice(openBraceIndex + 1, j), end: j + 1 }
}

function parseCondition(ts: TokenStream): ConditionNode {
  return parseOr(ts)
}

function parseOr(ts: TokenStream): ConditionNode {
  let left = parseAnd(ts)
  while (ts.peek().kind === 'ident' && ts.peek().value === 'or') {
    ts.next()
    const right = parseAnd(ts)
    left = { type: 'or', left, right }
  }
  return left
}

function parseAnd(ts: TokenStream): ConditionNode {
  let left = parseNot(ts)
  while (ts.peek().kind === 'ident' && ts.peek().value === 'and') {
    ts.next()
    const right = parseNot(ts)
    left = { type: 'and', left, right }
  }
  return left
}

function parseNot(ts: TokenStream): ConditionNode {
  if (ts.peek().kind === 'ident' && ts.peek().value === 'not') {
    ts.next()
    return { type: 'not', expr: parseNot(ts) }
  }
  return parsePrimary(ts)
}

function parseIdsSet(ts: TokenStream): string[] {
  // ( $a , $b , $c ) | them
  if (ts.peek().kind === 'ident' && ts.peek().value === 'them') {
    ts.next()
    return ['*']
  }
  ts.expect('(')
  const ids: string[] = []
  while (ts.peek().kind !== ')') {
    const t = ts.next()
    if (t.kind === 'ident' && t.value.startsWith('$')) {
      let id = t.value
      if (ts.peek().kind === '*') { ts.next(); id += '*' }
      ids.push(id)
    }
    if (ts.peek().kind === ',') ts.next()
  }
  ts.expect(')')
  return ids
}

function parsePrimary(ts: TokenStream): ConditionNode {
  const t = ts.peek()

  if (t.kind === '(') {
    ts.next()
    const inner = parseCondition(ts)
    ts.expect(')')
    return inner
  }

  if (t.kind === 'ident' && (t.value === 'true' || t.value === 'false')) {
    ts.next()
    return { type: 'bool', value: t.value === 'true' }
  }

  if (t.kind === 'ident' && (t.value === 'any' || t.value === 'all')) {
    ts.next()
    if (ts.peek().kind === 'ident' && ts.peek().value === 'of') ts.next()
    const ids = parseIdsSet(ts)
    return { type: 'of', count: t.value as 'any' | 'all', ids }
  }

  if (t.kind === 'number') {
    // "N of them" / "N of ($a,$b)"
    const savepoint = ts.savepoint()
    ts.next()
    if (ts.peek().kind === 'ident' && ts.peek().value === 'of') {
      ts.next()
      const ids = parseIdsSet(ts)
      return { type: 'of', count: parseInt(t.value, 10), ids }
    }
    ts.restore(savepoint)
  }

  if (t.kind === 'ident' && t.value === 'filesize') {
    ts.next()
    const opTok = ts.next()
    const numTok = ts.expect('number')
    return { type: 'filesize', op: opTok.value as '<' | '<=' | '>' | '>=' | '==' | '!=', value: parseInt(numTok.value, 10) }
  }

  if (t.kind === 'ident' && t.value.startsWith('$')) {
    ts.next()
    return { type: 'stringRef', id: t.value }
  }

  throw new Error(`YARA parse error: unexpected token "${t.value}" in condition`)
}

// Blanks out // and /* */ comments in place (same length, so downstream
// character offsets stay valid) without disturbing quoted string content.
function stripComments(src: string): string {
  let out = ''
  let i = 0
  const n = src.length
  let inString = false
  while (i < n) {
    const c = src[i]
    if (inString) {
      if (c === '\\' && i + 1 < n) { out += c + src[i + 1]; i += 2; continue }
      if (c === '"') inString = false
      out += c
      i++
      continue
    }
    if (c === '"') { inString = true; out += c; i++; continue }
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') { out += ' '; i++ }
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      out += '  '
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < n) { out += '  '; i += 2 }
      continue
    }
    out += c
    i++
  }
  return out
}

export function parseYaraSource(src: string): YaraRule[] {
  const rules: YaraRule[] = []
  let i = 0
  const n = src.length
  const stripped = stripComments(src)

  while (i < n) {
    const ruleIdx = stripped.indexOf('rule', i)
    if (ruleIdx === -1) break
    // ensure this is a standalone word "rule"
    const before = stripped[ruleIdx - 1]
    const after = stripped[ruleIdx + 4]
    if ((before && /[A-Za-z0-9_]/.test(before)) || (after && /[A-Za-z0-9_]/.test(after))) {
      i = ruleIdx + 4
      continue
    }

    // header: rule NAME (: tag tag)? {
    let j = ruleIdx + 4
    const headerTokens = tokenize(stripped.slice(j, stripped.indexOf('{', j)))
    const hs = new TokenStream(headerTokens)
    const nameTok = hs.expect('ident')
    const tags: string[] = []
    if (hs.peek().kind === ':') {
      hs.next()
      while (hs.peek().kind === 'ident') tags.push(hs.next().value)
    }

    const braceOpen = stripped.indexOf('{', j)
    if (braceOpen === -1) throw new Error(`YARA parse error: rule "${nameTok.value}" missing body`)

    // Find the matching closing brace for the rule body, being careful to
    // walk through nested hex-string blocks and quoted strings so braces
    // and quotes inside them don't confuse the depth counter.
    let depth = 1
    let k = braceOpen + 1
    while (k < n && depth > 0) {
      const ch = stripped[k]
      if (ch === '"') {
        k++
        while (k < n && stripped[k] !== '"') {
          if (stripped[k] === '\\') k++
          k++
        }
        k++
        continue
      }
      if (ch === '{') { depth++; k++; continue }
      if (ch === '}') { depth--; k++; continue }
      k++
    }
    const bodyEnd = k - 1
    const body = stripped.slice(braceOpen + 1, bodyEnd)

    rules.push(parseRuleBody(nameTok.value, tags, body))
    i = bodyEnd + 1
  }

  return rules
}

function parseRuleBody(name: string, tags: string[], body: string): YaraRule {
  const meta: Record<string, string | number | boolean> = {}
  const strings: YaraStringDef[] = []

  const metaIdx = indexOfSection(body, 'meta')
  const stringsIdx = indexOfSection(body, 'strings')
  const conditionIdx = indexOfSection(body, 'condition')
  if (conditionIdx === -1) throw new Error(`YARA parse error: rule "${name}" missing condition section`)

  const sectionBounds = [metaIdx, stringsIdx, conditionIdx].filter(x => x !== -1).sort((a, b) => a - b)
  const endOf = (start: number) => {
    const idx = sectionBounds.findIndex(s => s === start)
    return idx + 1 < sectionBounds.length ? sectionBounds[idx + 1] : body.length
  }

  if (metaIdx !== -1) {
    const metaBody = body.slice(metaIdx + 'meta'.length, endOf(metaIdx))
    parseMeta(metaBody, meta)
  }

  if (stringsIdx !== -1) {
    const stringsBody = body.slice(stringsIdx + 'strings'.length, endOf(stringsIdx))
    parseStrings(stringsBody, strings)
  }

  const conditionColon = body.indexOf(':', conditionIdx + 'condition'.length)
  const conditionBody = body.slice(conditionColon + 1)
  const condTokens = tokenize(conditionBody)
  const condition = parseCondition(new TokenStream(condTokens))

  return { name, tags, meta, strings, condition }
}

function indexOfSection(body: string, label: string): number {
  const re = new RegExp(`(^|[^A-Za-z0-9_])${label}\\s*:`)
  const m = re.exec(body)
  if (!m) return -1
  return m.index + m[0].indexOf(label)
}

function parseMeta(src: string, out: Record<string, string | number | boolean>) {
  // key = "value" | key = true/false | key = 123
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("((?:\\.|[^"\\])*)"|true|false|-?\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const key = m[1]
    if (m[3] !== undefined) {
      out[key] = m[3].replace(/\\(.)/g, '$1')
    } else if (m[2] === 'true' || m[2] === 'false') {
      out[key] = m[2] === 'true'
    } else {
      out[key] = parseInt(m[2], 10)
    }
  }
}

function parseStrings(src: string, out: YaraStringDef[]) {
  let i = 0
  const n = src.length
  while (i < n) {
    const dollar = src.indexOf('$', i)
    if (dollar === -1) break
    let j = dollar + 1
    while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++
    const id = src.slice(dollar, j)

    const eq = src.indexOf('=', j)
    if (eq === -1) break
    let k = eq + 1
    while (k < n && /\s/.test(src[k])) k++

    if (src[k] === '"') {
      // text string
      let p = k + 1
      let raw = ''
      while (p < n && src[p] !== '"') {
        if (src[p] === '\\' && p + 1 < n) { raw += src[p] + src[p + 1]; p += 2 }
        else { raw += src[p]; p++ }
      }
      const unescaped = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      p++ // closing quote
      const { mods, end } = readModifiers(src, p)
      out.push({
        id, kind: 'text', raw: unescaped,
        nocase: mods.has('nocase'), wide: mods.has('wide'),
        ascii: mods.has('ascii') || !mods.has('wide'), fullword: mods.has('fullword'),
      })
      i = end
    } else if (src[k] === '{') {
      const { body, end } = readHexBlock(src, k)
      const { mods, end: end2 } = readModifiers(src, end)
      out.push({
        id, kind: 'hex', raw: body.trim(),
        nocase: false, wide: false, ascii: true, fullword: false,
      })
      void mods
      i = end2
    } else {
      i = k + 1
    }
  }
}

function readModifiers(src: string, from: number): { mods: Set<string>; end: number } {
  const mods = new Set<string>()
  let i = from
  const n = src.length
  const known = ['nocase', 'wide', 'ascii', 'fullword', 'private']
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++
    let j = i
    while (j < n && /[A-Za-z]/.test(src[j])) j++
    const word = src.slice(i, j)
    if (known.includes(word)) { mods.add(word); i = j }
    else break
  }
  return { mods, end: i }
}
