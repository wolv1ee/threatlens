# YARA rules

Every `.yar` / `.yara` file in this directory is loaded and evaluated against
uploaded files by the file-scan endpoint, in addition to the VirusTotal hash
lookup.

## Why a custom engine instead of `libyara`?

Real YARA is a C library with native bindings (`yara-python`, `node-yara`,
etc.). Vercel's serverless Node functions can't load arbitrary native
binaries, so `lib/yara/` ships a small parser + matcher written in
TypeScript that understands a practical subset of the YARA language. Rules
here are written in **standard YARA syntax** - if you ever want to run them
through the real `yara` CLI or `yara-python` instead, you can, unmodified.

## Supported syntax

- `meta:` - key/value pairs (string, boolean, integer). `description` and
  `severity` are used by the UI; `severity` should be one of
  `info | low | medium | high | critical`.
- `strings:`
  - Text strings: `$a = "some text"`, with `nocase`, `wide`, `ascii`, and
    `fullword` modifiers.
  - Hex strings: `$a = { 4D 5A ?? ?? }`, supporting full-byte wildcards
    (`??`), nibble wildcards (`4?`, `?A`), and single-level alternation
    (`{ 4D 5A | 5A 4D }`).
- `condition:`
  - Boolean logic: `and`, `or`, `not`, parentheses.
  - String references: `$a`, `$a and $b`, etc.
  - Set conditions: `any of them`, `all of them`, `N of them`,
    `N of ($a, $b, $c)`, and prefix wildcards (`1 of ($a*)`).
  - `filesize` comparisons: `filesize < 500KB`.

Not supported (kept out of scope for the serverless engine): regex string
literals (`/foo.*bar/`), jump ranges in hex strings (`[0-4]`), external
modules (`pe`, `math`, ...), and `for`/loop conditions. Sticking to the
subset above keeps rules fast and predictable to evaluate per-request.

## Adding a rule

Drop a new `.yar` file in this directory (or add a rule to an existing
file) and redeploy - rules are read from disk once per cold start and
cached for the life of the function instance. There's no build step.

## Files

- `eicar.yar` - matches the industry-standard EICAR test string. Safe to
  use for testing: download the real test file from
  [eicar.org](https://www.eicar.org/download-anti-malware-testfile/) and
  upload it to confirm the pipeline is wired up end to end.
- `malware-heuristics.yar` - generic, publicly documented indicators
  (LOLBins, webshells, credential dumping, process injection, ransomware
  note language, Cobalt Strike artifacts, etc.). These are heuristics, not
  family-specific signatures - a match is a signal to investigate further,
  not automatic proof of malice.
