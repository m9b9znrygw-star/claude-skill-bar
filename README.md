# claude-skill-bar

A skill menu for Claude Code. Open it from the **Skills** button above the prompt (or `/skillbar`), browse every skill on your machine by topic, search, pin favourites, and click one to put its command in the prompt.

一個 Claude Code 的 Skill 選單:點提示框上方的 **Skills** 按鈕(或輸入 `/skillbar`),依主題瀏覽電腦上所有的 skill、搜尋、釘選常用項目,點一下就把指令填進輸入框。

## Features / 功能

- **Auto-discovery, nothing to maintain.** Scans personal skills (`~/.claude/skills`), project skills (`.claude/skills`), installed and synced plugins, and any other `SKILL.md` Spotlight finds on the computer.
- **Auto-categorised** into Finance, Web data, Documents, Design, Media, Marketing & SEO, Memory & notes, Automation, Setup & ops, Productivity, Development, plus Built-in commands. Each tab shows a count.
- **Search** with several words (all must match), on names, descriptions and topics. Press Enter on a single match to insert it.
- **Recent** and **Pinned** tabs (☆ / ★) that survive restarts.
- **Marketplace skills** (not installed yet) are hidden by default and flagged when shown.
- **Rescan** button, so a skill you just added shows up without reloading.
- **English and 繁體中文**; follows your system language, or set it in the plugin's options.

## Install / 安裝

At the prompt of a terminal session:

```
/plugin install skill-bar --marketplace m9b9znrygw-star/claude-skill-bar
```

From a shell:

```
claude plugin install skill-bar --marketplace m9b9znrygw-star/claude-skill-bar
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `m9b9znrygw-star/claude-skill-bar`, then **Add plugin**.

## Use / 使用

| Do | Result |
| --- | --- |
| Click **Skills** above the prompt, or run `/skillbar` | opens the panel |
| Click a topic tab | filters the list |
| Type in the search box | filters by every word you type |
| Click a skill | puts `/skill-name ` in the prompt |
| Click ☆ | pins it (★ unpins) |
| **Show not-installed** | also lists skills from plugin marketplaces you have not installed |
| **Rescan** | reads the disk again |

## Options / 設定

| Option | Values | Default |
| --- | --- | --- |
| `language` | `auto`, `en`, `zh-TW` | `auto` |

## Privacy and limits / 隱私與限制

- Everything runs locally. The mod only **reads** `SKILL.md` files and plugin manifests; it writes nothing and sends nothing anywhere. Pins and recent skills are kept in the plugin's own store.
- The whole-computer scan uses macOS Spotlight (`mdfind`). On other systems that step is skipped; every other source still works. Test fixtures, `node_modules`, caches, the trash and `Library/Application Support` are ignored.
- Topic assignment is keyword-based, so an unusual skill may land in **Other**.
- Built-in slash commands cannot be discovered from disk, so that list is fixed.
- A skill found only elsewhere on the computer ("on this computer") is inserted as `/name`, but it runs only if Claude Code actually loads it.

## Develop / 開發

```
claude plugin validate .
claude plugin test .
```

## License

MIT
