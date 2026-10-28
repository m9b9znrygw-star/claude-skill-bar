import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

type Src = 'installed' | 'market' | 'local' | 'builtin'
type Skill = { cmd: string; hint: string; src: Src }
type Category = { id: string; skills: Skill[] }
type Lang = 'en' | 'zh'
// What scanning needs from the engine. `$` itself may not be bound or passed
// around, so each hook builds one of these from literal `$.noun.event` calls.
type Host = {
  read: (p: string) => Promise<any>
  list: (p?: string) => Promise<{ name: string }[]>
  home: () => Promise<string | undefined>
  run: (argv: readonly string[], init?: { timeoutMs?: number }) => Promise<{ stdout: string }>
}

// ---------------------------------------------------------------- text

const TEXT = {
  en: {
    placeholder: 'Search skills or what they do…',
    search: 'Search',
    all: 'All',
    recent: 'Recent',
    pinned: 'Pinned',
    other: 'Other',
    builtin: 'Built-in',
    open: 'Skills',
    openHint: 'browse, search, pin',
    title: 'Skills',
    opened: 'Skill panel opened.',
    commandDesc: 'Open the skill panel (categories, search, descriptions)',
    count: (n: number) => `${n} skill${n === 1 ? '' : 's'} · click to put the command in the prompt`,
    more: (n: number) => `…and ${n} more. Search or pick a category to narrow down.`,
    none: 'No skill matches.',
    empty: 'Nothing here yet. Use a skill and it shows up under Recent; pin one with ☆.',
    marketOn: 'Hide not-installed',
    marketOff: 'Show not-installed',
    rescan: 'Rescan',
    notInstalled: '[not installed] ',
    local: '[on this computer] ',
    pin: '☆',
    unpin: '★',
    topics: {
      finance: 'Finance',
      web: 'Web data',
      docs: 'Documents',
      design: 'Design',
      media: 'Media',
      marketing: 'Marketing & SEO',
      memory: 'Memory & notes',
      automation: 'Automation',
      ops: 'Setup & ops',
      productivity: 'Productivity',
      dev: 'Development',
    } as Record<string, string>,
  },
  zh: {
    placeholder: '搜尋 skill 或用途…',
    search: '搜尋',
    all: '全部',
    recent: '最近用過',
    pinned: '釘選',
    other: '其他',
    builtin: '內建',
    open: 'Skills',
    openHint: '分類、搜尋、釘選',
    title: 'Skills',
    opened: 'Skill 面板已開啟。',
    commandDesc: '開啟 Skill 面板(分類、搜尋、用途)',
    count: (n: number) => `${n} 個 · 點一下把指令填進輸入框`,
    more: (n: number) => `…還有 ${n} 個,請搜尋或選分類縮小範圍。`,
    none: '沒有符合的 skill。',
    empty: '這裡還沒有東西。用過的 skill 會出現在「最近用過」,也可以按 ☆ 釘選。',
    marketOn: '隱藏未安裝',
    marketOff: '顯示未安裝',
    rescan: '重新掃描',
    notInstalled: '〔未安裝〕',
    local: '〔本機〕',
    pin: '☆',
    unpin: '★',
    topics: {
      finance: '金融',
      web: '網頁資料',
      docs: '文件',
      design: '設計',
      media: '媒體',
      marketing: '行銷與 SEO',
      memory: '記憶與知識',
      automation: '自動化',
      ops: '設定與維運',
      productivity: '生產力',
      dev: '開發',
    } as Record<string, string>,
  },
}

// Built-in commands cannot be discovered from disk, so they stay a fixed list:
// [command, English, 繁體中文].
const BUILTIN: [string, string, string][] = [
  ['help', 'Show help and available commands', '顯示說明與可用指令'],
  ['clear', 'Clear the conversation and start fresh', '清除對話,開始新的上下文'],
  ['compact', 'Compact the conversation to save context', '壓縮對話,節省上下文空間'],
  ['context', 'See how much context is used', '查看目前上下文用量'],
  ['usage', 'See usage and limits', '查看用量與額度'],
  ['status', 'Show the current status', '查看目前狀態'],
  ['model', 'Switch model', '切換模型'],
  ['effort', 'Adjust thinking effort', '調整思考強度'],
  ['fast', 'Toggle fast mode', '切換快速模式'],
  ['plan', 'Enter plan mode', '進入規劃模式'],
  ['resume', 'Resume an earlier conversation', '繼續先前的對話'],
  ['branch', 'Branch the conversation', '從目前對話分支出新對話'],
  ['fork', 'Fork the conversation', '複製目前對話另開一條'],
  ['rename', 'Rename this session', '重新命名這個工作階段'],
  ['recap', 'Recap the progress so far', '摘要目前進度'],
  ['diff', 'Show this session’s file changes', '查看這次的檔案變更'],
  ['memory', 'Edit CLAUDE.md memory files', '編輯 CLAUDE.md 記憶檔'],
  ['add-dir', 'Add another working folder', '加入額外的工作資料夾'],
  ['agents', 'Manage subagents', '管理子代理'],
  ['tasks', 'Show background tasks', '查看背景任務'],
  ['background', 'Run the work in the background', '把工作放到背景執行'],
  ['goal', 'Set a goal', '設定目標'],
  ['mcp', 'Manage MCP servers', '管理 MCP 伺服器'],
  ['plugin', 'Manage plugins', '管理外掛'],
  ['reload-plugins', 'Reload plugins', '重新載入外掛'],
  ['reload-skills', 'Reload skills', '重新載入 skill'],
  ['skills', 'List available skills', '列出可用的 skill'],
  ['skill-doctor', 'Check skills for problems', '檢查 skill 的問題'],
  ['export', 'Export the conversation', '匯出對話'],
  ['copy', 'Copy the last reply', '複製最近的回覆'],
  ['btw', 'Ask a quick side question', '順帶問一個旁支問題'],
  ['theme', 'Change the color theme', '切換外觀主題'],
  ['output-style', 'Change the output style', '切換輸出風格'],
  ['ide', 'Connect to an IDE', '連接 IDE'],
  ['install-github-app', 'Install the GitHub app', '安裝 GitHub App'],
  ['remote-control', 'Control this session remotely', '遠端控制這個工作階段'],
  ['ultraplan', 'Deep planning in the cloud', '雲端深度規劃'],
  ['feedback', 'Send feedback', '送出意見回饋'],
  ['login', 'Sign in', '登入'],
  ['logout', 'Sign out', '登出'],
  ['version', 'Show the version', '顯示版本'],
]

// --------------------------------------------------------- classification

// Topic buckets, in display order. A skill lands in the first topic whose
// pattern matches its name; failing that, the first matching its description.
const TOPICS: [id: string, pattern: RegExp][] = [
  ['finance', /bigdata|stock|earnings|invest|financ|valuation|ipo\b|equity|market data|財報|投資/i],
  ['web', /bright-?data|bright data|live-research|rag-pipeline|price-comparison|\bsearch\b|scrap|crawl|serp|proxy|web data|search the web|browser/i],
  ['docs', /docx|pdf|pptx|xlsx|\bword\b|excel|powerpoint|spreadsheet|slide|deck|google-workspace|\bdocs?\b|document/i],
  ['design', /design|diagram|chart|dataviz|artifact|frontend|visual|archify|\bui\b|\bux\b|mockup|figma/i],
  ['media', /video|image|audio|music|thumbnail|photo|voice|podcast/i],
  ['marketing', /seo|marketing|social media|brand|campaign|newsletter|\bads?\b/i],
  ['memory', /memory|mem-search|graphify|knowledge|timeline|handoff|digest|standup|recall|notes?\b/i],
  ['automation', /schedule|\bloop\b|cron|automat|recurring|workflow|routine|babysit/i],
  ['ops', /config|keybinding|permission|settings|setup|install|deploy|docker|kubernetes|devops|\bci\b/i],
  ['productivity', /task|calendar|morning|todo|productivity|plan\b|meeting|email/i],
  ['dev', /code|smart-explore|review|build|release|debug|refactor|\bgit\b|\bsdk\b|\bapi\b|plugin|test|simplify|security|lint|version|\bapp\b|mcp|claude/i],
]
const ORDER = [...TOPICS.map(([id]) => id), 'other']

const topicOf = (cmd: string, hint: string) => {
  const name = cmd.toLowerCase()
  for (const [t, re] of TOPICS) if (re.test(name)) return t
  for (const [t, re] of TOPICS) if (re.test(hint)) return t
  return 'other'
}

// -------------------------------------------------------------- scanning

// Spotlight also finds test fixtures, vendored code, caches and the trash.
const SKIP_PATH =
  /\/(node_modules|fixtures?|tests?|__tests__|examples?|templates?|\.Trash|\.git|dist|build)\/|\/Library\/(Caches|Application Support)\//i

// Pulls name and description out of a SKILL.md's YAML frontmatter.
const parseSkill = (text: string): { name?: string; description?: string } => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!m) return {}
  const lines = m[1].split(/\r?\n/)
  const out: Record<string, string> = {}
  for (let i = 0; i < lines.length; i++) {
    const kv = /^(name|description):\s*(.*)$/.exec(lines[i])
    if (!kv) continue
    let v = kv[2].trim()
    if (/^[>|][+-]?$/.test(v)) {
      const parts: string[] = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim())
      v = parts.join(' ')
    } else if (/^(["']).*\1$/.test(v)) {
      v = v.slice(1, -1)
    }
    out[kv[1]] = v
  }
  return out
}

const brief = (d: string) => {
  const first = d.split(/(?<=[.。!?])\s/)[0] ?? d
  return first.length > 90 ? first.slice(0, 89) + '…' : first
}

const readJson = async (h: Host, path: string): Promise<any> => {
  const raw = await h.read(path).catch(() => undefined)
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

// Reads <dir>/<skill>/SKILL.md for each skill folder; prefix is "plugin:" or "".
const scanDir = async (h: Host, dir: string, prefix: string, src: Src): Promise<Skill[]> => {
  const entries = await h.list(dir).catch(() => [])
  const found: Skill[] = []
  await Promise.all(
    entries.map(async e => {
      const text = await h.read(`${dir}/${e.name}/SKILL.md`).catch(() => undefined)
      if (typeof text !== 'string') return
      const meta = parseSkill(text)
      found.push({ cmd: `${prefix}${meta.name ?? e.name}`, hint: brief(meta.description ?? ''), src })
    }),
  )
  return found
}

// Every place a skill can live: personal, project, installed and synced
// plugins and skills, then the marketplaces (not installed), then anywhere
// else on the computer through Spotlight.
const scanAll = async (h: Host): Promise<Category[]> => {
  const home = await h.home()
  const jobs: Promise<Skill[]>[] = [scanDir(h, '.claude/skills', '', 'installed')]
  const market: Promise<Skill[]>[] = []

  if (home) {
    const root = `${home}/.claude`
    jobs.push(scanDir(h, `${root}/skills`, '', 'installed'))

    const installed = (await readJson(h, `${root}/plugins/installed_plugins.json`))?.plugins ?? {}
    for (const [key, installs] of Object.entries<any>(installed)) {
      const path = installs?.[0]?.installPath
      if (path) jobs.push(scanDir(h, `${path}/skills`, `${key.split('@')[0]}:`, 'installed'))
    }

    for (const acct of await h.list(`${root}/plugins/synced`).catch(() => [])) {
      const base = `${root}/plugins/synced/${acct.name}`
      for (const d of await h.list(base).catch(() => [])) {
        const meta = await readJson(h, `${base}/${d.name}/.claude-plugin/plugin.json`)
        if (meta?.name) jobs.push(scanDir(h, `${base}/${d.name}/skills`, `${meta.name}:`, 'installed'))
      }
    }
    for (const acct of await h.list(`${root}/skills/synced`).catch(() => [])) {
      jobs.push(scanDir(h, `${root}/skills/synced/${acct.name}`, 'anthropic-skills:', 'installed'))
    }

    const mroot = `${root}/plugins/marketplaces`
    for (const m of await h.list(mroot).catch(() => [])) {
      for (const sub of ['', '/plugins', '/external_plugins']) {
        const base = `${mroot}/${m.name}${sub}`
        for (const d of await h.list(base).catch(() => [])) {
          const dir = `${base}/${d.name}`
          const meta = await readJson(h, `${dir}/.claude-plugin/plugin.json`)
          market.push(scanDir(h, `${dir}/skills`, `${meta?.name ?? d.name}:`, 'market'))
        }
      }
    }
  }

  const local: Skill[] = []
  const found = await h.run(['mdfind', '-name', 'SKILL.md'], { timeoutMs: 10000 }).catch(() => undefined)
  const files = (found?.stdout ?? '')
    .split('\n')
    .filter(f => f.endsWith('/SKILL.md') && !SKIP_PATH.test(f))
    .slice(0, 400)
  await Promise.all(
    files.map(async f => {
      const text = await h.read(f).catch(() => undefined)
      if (typeof text !== 'string') return
      const meta = parseSkill(text)
      local.push({ cmd: meta.name ?? f.split('/').slice(-2)[0], hint: brief(meta.description ?? ''), src: 'local' })
    }),
  )

  // Earlier sources win: a marketplace or local skill is dropped when the same
  // command, or the same bare name for a local one, is already known.
  const seen = new Set<string>()
  const bare = new Set<string>()
  const byTopic = new Map<string, Skill[]>()
  const everything = [...(await Promise.all(jobs)).flat(), ...(await Promise.all(market)).flat(), ...local]
  for (const s of everything) {
    const base = s.cmd.split(':').pop()!
    if (seen.has(s.cmd) || (s.src === 'local' && bare.has(base))) continue
    seen.add(s.cmd)
    bare.add(base)
    const t = topicOf(s.cmd, s.hint)
    byTopic.set(t, [...(byTopic.get(t) ?? []), s])
  }

  return ORDER.filter(id => byTopic.has(id)).map(id => ({
    id,
    skills: byTopic.get(id)!.sort((a, b) => a.cmd.localeCompare(b.cmd)),
  }))
}

// Scanned once per module load, and again on "Rescan".
let scanned: Promise<Category[]> | undefined
const categories = (h: Host) => (scanned ??= scanAll(h).catch(() => []))
const rescan = () => {
  scanned = undefined
}

// ------------------------------------------------------------------ state

const PANE = 'skill-bar'
const ALL = 'all'
const RECENT = 'recent'
const PINNED = 'pinned'
const BUILTIN_ID = 'builtin'
const MAX_ROWS = 80
const MAX_RECENT = 8

const query = atom({ plugin: 'skill-bar', key: 'query' } as const, '')
const cat = atom({ plugin: 'skill-bar', key: 'cat' } as const, ALL)
const showMarket = atom({ plugin: 'skill-bar', key: 'showMarket' } as const, false)
// Bumped whenever something outside the atoms changed (rescan, pin, recent).
const rev = atom({ plugin: 'skill-bar', key: 'rev' } as const, 0)

const language = (option: unknown, system: string): Lang => {
  if (option === 'en') return 'en'
  if (option === 'zh-TW') return 'zh'
  return /^[("\s]*zh/i.test(system) ? 'zh' : 'en'
}

// The system language: LC_ALL or LANG when set, else (the desktop app sets
// neither) the first macOS preferred language. Asked once per module load.
let systemLanguage: Promise<string> | undefined
const systemLang = (env: () => Promise<string>, run: Host['run']) =>
  (systemLanguage ??= (async () => {
    const fromEnv = await env().catch(() => '')
    if (fromEnv) return fromEnv
    const out = await run(['defaults', 'read', '-g', 'AppleLanguages'], { timeoutMs: 3000 }).catch(() => undefined)
    return out?.stdout ?? ''
  })())

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const L = TEXT[language(options.language, await systemLang(async () => (await $.env.get('LC_ALL')) || (await $.env.get('LANG')) || '', (argv, init) => $.process.run(argv, init)))]
    await $.command.register({ name: 'skillbar', description: L.commandDesc })

    return next(e)
  })

  on('command.run', { command: 'skillbar' }, async $ => {
    const L = TEXT[language(options.language, await systemLang(async () => (await $.env.get('LC_ALL')) || (await $.env.get('LANG')) || '', (argv, init) => $.process.run(argv, init)))]
    await $.ui.open({ id: PANE, title: L.title, focus: true })

    return { text: L.opened }
  })

  // A slim entry above the prompt: one button that opens the pane.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const L = TEXT[language(options.language, await systemLang(async () => (await $.env.get('LC_ALL')) || (await $.env.get('LANG')) || '', (argv, init) => $.process.run(argv, init)))]
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={2}>
        <Button
          key="open-skills"
          label={L.open}
          onPress={() => $.ui.open({ id: PANE, title: L.title, focus: true })}
        />
        <Text dimColor>{L.openHint}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const host: Host = {
      read: p => $.fs.read(p),
      list: p => $.fs.list(p),
      home: () => $.env.get('HOME'),
      run: (argv, init) => $.process.run(argv, init),
    }
    const { Box, Button, Input, Text } = $.ui.resolve(e)
    const L = TEXT[language(options.language, await systemLang(async () => (await $.env.get('LC_ALL')) || (await $.env.get('LANG')) || '', (argv, init) => $.process.run(argv, init)))]
    await read($, rev)

    const scannedCats = await categories(host)
    const withMarket = await read($, showMarket)
    const current = await read($, cat)
    const raw = await read($, query)
    const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean)

    const recent = ((await $.store.get('recent')) as string[] | undefined) ?? []
    const pins = ((await $.store.get('pins')) as string[] | undefined) ?? []

    const visible = (s: Skill) => withMarket || s.src !== 'market'
    const builtin: Skill[] = BUILTIN.map(([cmd, en, zh]) => ({
      cmd,
      hint: L === TEXT.zh ? zh : en,
      src: 'builtin',
    }))
    const cats: Category[] = [
      ...scannedCats.map(c => ({ id: c.id, skills: c.skills.filter(visible) })),
      { id: BUILTIN_ID, skills: builtin },
    ].filter(c => c.skills.length)
    const everySkill = cats.flatMap(c => c.skills)
    const byCmd = new Map(everySkill.map(s => [s.cmd, s]))
    const pick = (cmds: string[]) => cmds.map(c => byCmd.get(c)).filter((s): s is Skill => !!s)

    const label = (id: string) =>
      id === ALL ? L.all : id === RECENT ? L.recent : id === PINNED ? L.pinned
      : id === BUILTIN_ID ? L.builtin : id === 'other' ? L.other : L.topics[id] ?? id

    const tabs: { id: string; skills: Skill[] }[] = [
      { id: ALL, skills: everySkill },
      ...(recent.length ? [{ id: RECENT, skills: pick(recent) }] : []),
      ...(pins.length ? [{ id: PINNED, skills: pick(pins) }] : []),
      ...cats,
    ]
    const active = tabs.find(t => t.id === current) ?? tabs[0]

    const rows = active.skills.filter(s => {
      const hay = `${s.cmd} ${s.hint} ${label(topicOf(s.cmd, s.hint))}`.toLowerCase()
      return tokens.every(t => hay.includes(t))
    })
    const shown = rows.slice(0, MAX_ROWS)

    const fill = async (s: Skill) => {
      await $.prompt.fill({ text: `/${s.cmd} `, mode: 'replace' })
      await $.store.set('recent', [s.cmd, ...recent.filter(c => c !== s.cmd)].slice(0, MAX_RECENT))
      await update($, rev, n => n + 1)
    }
    const togglePin = async (s: Skill) => {
      await $.store.set('pins', pins.includes(s.cmd) ? pins.filter(c => c !== s.cmd) : [s.cmd, ...pins])
      await update($, rev, n => n + 1)
    }
    const tag = (s: Skill) => (s.src === 'market' ? L.notInstalled : s.src === 'local' ? L.local : '')

    return (
      <Box flexDirection="column" gap={1}>
        <Input
          key="search"
          placeholder={L.placeholder}
          value={raw}
          submitLabel={L.search}
          onInput={v => update($, query, () => v)}
          onSubmit={async v => {
            await update($, query, () => v)
            // Enter on a single match puts it straight into the prompt.
            if (rows.length === 1) await fill(rows[0])
          }}
        />
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {tabs.map(t => (
            <Button
              key={`cat-${t.id}`}
              label={`${label(t.id)} ${t.skills.length}`}
              variant={t.id === active.id ? 'primary' : 'secondary'}
              onPress={() => update($, cat, () => t.id)}
            />
          ))}
        </Box>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          <Button
            key="toggle-market"
            label={withMarket ? L.marketOn : L.marketOff}
            variant="secondary"
            onPress={() => update($, showMarket, v => !v)}
          />
          <Button
            key="rescan"
            label={L.rescan}
            variant="secondary"
            onPress={async () => {
              rescan()
              await update($, rev, n => n + 1)
            }}
          />
        </Box>
        <Text dimColor>{L.count(rows.length)}</Text>
        <Box flexDirection="column" gap={1}>
          {rows.length === 0 && (
            <Text dimColor>{tokens.length === 0 && active.id !== ALL ? L.empty : L.none}</Text>
          )}
          {shown.map(s => (
            <Box key={`line-${s.cmd}`} flexDirection="row" gap={1}>
              <Button
                key={`pin-${s.cmd}`}
                plain
                label={pins.includes(s.cmd) ? L.unpin : L.pin}
                onPress={() => togglePin(s)}
              />
              <Button key={`row-${s.cmd}`} plain onPress={() => fill(s)}>
                <Text bold>/{s.cmd}</Text> <Text dimColor>{tag(s)}{s.hint}</Text>
              </Button>
            </Box>
          ))}
          {rows.length > shown.length && <Text dimColor>{L.more(rows.length - shown.length)}</Text>}
        </Box>
      </Box>
    )
  })
}
