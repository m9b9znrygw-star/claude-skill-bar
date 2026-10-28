import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'skill-bar',
  component: 'Pane',
  requestId: 'skill-bar',
  props: { title: 'Skills', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

const SKILL = (name: string, description: string) => `---\nname: ${name}\ndescription: ${description}\n---\nbody`

// A tiny machine: one personal skill, one in a marketplace plugin, nothing else.
const FILES: Record<string, string> = {
  '/h/.claude/skills/pdf-maker/SKILL.md': SKILL('pdf-maker', 'Create PDF documents.'),
  '/h/.claude/plugins/marketplaces/m/plugins/shop/.claude-plugin/plugin.json': '{"name":"shop"}',
  '/h/.claude/plugins/marketplaces/m/plugins/shop/skills/cart/SKILL.md': SKILL('cart', 'Fill a shopping cart.'),
}
const DIRS: Record<string, string[]> = {
  '/h/.claude/skills': ['pdf-maker'],
  '/h/.claude/plugins/marketplaces': ['m'],
  '/h/.claude/plugins/marketplaces/m/plugins': ['shop'],
  '/h/.claude/plugins/marketplaces/m/plugins/shop/skills': ['cart'],
}

const machine = (on: any, stored: Record<string, unknown> = {}) => {
  const writes: Record<string, unknown> = {}
  on('env.get', (_: unknown, e: { name: string }) => ({ value: e.name === 'HOME' ? '/h' : undefined }))
  on('fs.list', (_: unknown, e: { path: string }) => ({ value: (DIRS[e.path] ?? []).map(name => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })) }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    if (e.path in FILES) return { value: FILES[e.path] }
    return { value: '' }
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }))
  on('store.get', (_: unknown, e: { key: string }) => ({ value: stored[e.key] }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => {
    writes[e.key] = e.value
    return { value: undefined }
  })
  on('prompt.fill', () => ({ value: undefined }))
  return writes
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`the pane lists and filters skills on ${surface}`, { options: { language: 'en' } }, async ($, on) => {
    machine(on)
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Button', text: /pdf-maker/ })).toBeTruthy()
    expect(await ui.find({ type: 'Button', text: /compact/ })).toBeTruthy()
    await ui.input({ plugin: 'skill-bar', key: 'search', text: 'compact' })
    expect(await ui.find({ type: 'Button', text: /compact/ })).toBeTruthy()
    expect(await ui.find({ type: 'Button', text: /pdf-maker/ })).toBeFalsy()
    await ui.unmount()
  })
}

test('a scanned skill is sorted into a topic', { options: { language: 'en' } }, async ($, on) => {
  machine(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', text: /Documents 1/ })).toBeTruthy()
  await ui.unmount()
})

test('not-installed skills stay hidden until asked for', { options: { language: 'en' } }, async ($, on) => {
  machine(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', text: /shop:cart/ })).toBeFalsy()
  await ui.press({ plugin: 'skill-bar', key: 'toggle-market' })
  expect(await ui.find({ type: 'Button', text: /shop:cart/ })).toBeTruthy()
  await ui.unmount()
})

test('several search words must all match', { options: { language: 'en' } }, async ($, on) => {
  machine(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.input({ plugin: 'skill-bar', key: 'search', text: 'switch model' })
  expect(await ui.find({ type: 'Button', text: /\/model/ })).toBeTruthy()
  expect(await ui.find({ type: 'Button', text: /\/compact/ })).toBeFalsy()
  await ui.unmount()
})

test('pinning a skill is stored', { options: { language: 'en' } }, async ($, on) => {
  const writes = machine(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ plugin: 'skill-bar', key: 'pin-pdf-maker' })
  expect(writes.pins).toEqual(['pdf-maker'])
  await ui.unmount()
})

test('the language option picks the built-in descriptions', { options: { language: 'zh-TW' } }, async ($, on) => {
  machine(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.input({ plugin: 'skill-bar', key: 'search', text: '壓縮對話' })
  expect(await ui.find({ type: 'Button', text: /compact/ })).toBeTruthy()
  await ui.unmount()
})

test('the band has an entry button', async ($, on) => {
  machine(on)
  const ui = await $.ui.mount({
    plugin: 'skill-bar', surface: 'desktop', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 } },
  })
  expect(await ui.find({ type: 'Button', text: /Skills/ })).toBeTruthy()
  await ui.unmount()
})

test('with no LANG, auto follows the macOS preferred language', async ($, on) => {
  machine(on)
  on('process.run', (_: unknown, e: { argv: string[] }) => ({
    value: { exitCode: 0, stderr: '', stdout: e.argv[0] === 'defaults' ? '(\n    "zh-Hant-TW"\n)' : '' },
  }))
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.input({ plugin: 'skill-bar', key: 'search', text: '壓縮對話' })
  expect(await ui.find({ type: 'Button', text: /compact/ })).toBeTruthy()
  await ui.unmount()
})
