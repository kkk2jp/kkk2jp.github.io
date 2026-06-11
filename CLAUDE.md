# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server (localhost:4321)
npm run build    # static build → dist/
npm run preview  # preview built output
```

No test runner is configured.

## Architecture

Astro v6 static site deployed to GitHub Pages (`https://kkk2jp.github.io`). Uses the Content Collections API with a `blog` collection.

### Content structure

Blog posts live under `src/content/blog/{category}/{slug}.md`. The glob loader sets `post.id` to `{category}/{slug}`, which is split on `/` to derive route params throughout the codebase.

Four fixed categories (slug → label defined in `src/consts.ts`):

| Slug | Label |
|------|-------|
| `dotnet` | `.NET/C#` |
| `bi` | `BIツール` |
| `ai` | `AI` |

`getCategoryLabel(slug)` from `src/consts.ts` converts slugs to display names. Always use this function rather than hardcoding labels.

### URL structure

- Post: `/{category}/{slug}/`
- Category listing: `/{category}/`
- RSS: `/rss.xml`

Pages are at `src/pages/[category]/[slug].astro` and `src/pages/[category]/index.astro`. The old `/blog/` prefix no longer exists.

### heroImage path

Because posts sit one level deeper than the old flat structure, `heroImage` in frontmatter must use `../../../assets/blog-placeholder-X.jpg` (three levels up from `src/content/blog/{category}/`).

## Custom slash commands

`.claude/commands/new-post.md` powers the `/new-post` skill for creating new blog posts interactively.
