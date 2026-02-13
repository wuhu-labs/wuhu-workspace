#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ISSUES_DIR = path.join(ROOT, 'issues');
const DIST_DIR = path.join(ROOT, 'dist');
const DIST_ISSUES_DIR = path.join(DIST_DIR, 'issues');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripMdExtension(fileName) {
  return fileName.replace(/\.md$/i, '');
}

function toToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function parseIssueId(fileName) {
  const match = fileName.match(/^(\d{3})-/);
  return match ? match[1] : stripMdExtension(fileName);
}

function extractIdsFromValue(value) {
  const ids = new Set();
  const linkMatches = value.matchAll(/\(([^)]+\.md)\)/g);
  for (const match of linkMatches) {
    const base = path.basename(match[1]);
    const id = parseIssueId(base);
    if (id) {
      ids.add(id);
    }
  }
  const idMatches = value.matchAll(/\b(\d{3})\b/g);
  for (const match of idMatches) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

function normalizeLink(url, pageType) {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || url.startsWith('#')) {
    return url;
  }

  if (url.endsWith('.md')) {
    const base = path.basename(url);
    const htmlName = stripMdExtension(base) + '.html';
    return pageType === 'index' ? `issues/${htmlName}` : htmlName;
  }

  return url;
}

function renderInline(text, pageType) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const normalized = normalizeLink(url, pageType);
    const external = /^https?:\/\//i.test(normalized);
    const attrs = external ? ' target="_blank" rel="noreferrer noopener"' : '';
    return `<a href="${escapeHtml(normalized)}"${attrs}>${label}</a>`;
  });

  return html;
}

function renderMarkdown(markdown, pageType) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false;
  let codeLang = '';
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    out.push(`<p>${renderInline(paragraph.join(' '), pageType)}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) {
      return;
    }
    out.push(listType === 'ol' ? '</ol>' : '</ul>');
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inCode) {
      if (trimmed.startsWith('```')) {
        out.push('</code></pre>');
        inCode = false;
        codeLang = '';
      } else {
        out.push(`${escapeHtml(line)}\n`);
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushParagraph();
      closeList();
      codeLang = trimmed.slice(3).trim();
      const className = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : '';
      out.push(`<pre><code${className}>`);
      inCode = true;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2], pageType)}</h${level}>`);
      continue;
    }

    const ulMatch = trimmed.match(/^-\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') {
        closeList();
      }
      if (!listType) {
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${renderInline(ulMatch[1], pageType)}</li>`);
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') {
        closeList();
      }
      if (!listType) {
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${renderInline(olMatch[1], pageType)}</li>`);
      continue;
    }

    if (trimmed === '---') {
      flushParagraph();
      closeList();
      out.push('<hr />');
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  if (inCode) {
    out.push('</code></pre>');
  }

  return out.join('\n');
}

function parseIssue(fileName, markdown) {
  const slug = stripMdExtension(fileName);
  const id = parseIssueId(fileName);
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let title = slug;
  if (lines[0] && lines[0].startsWith('# ')) {
    title = lines[0].replace(/^#\s+/, '').trim();
  }

  const metadata = {};
  for (const line of lines) {
    const match = line.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase();
      metadata[key] = match[2].trim();
    }
  }

  const dependsOnValue = metadata['depends on'] || metadata['depends on '] || 'None';
  const blocksValue = metadata['blocks'] || 'None';
  const dependsOnIds = /^(none|—)$/i.test(dependsOnValue) ? [] : extractIdsFromValue(dependsOnValue);
  const blocksIds = /^(none|—)$/i.test(blocksValue) ? [] : extractIdsFromValue(blocksValue);
  const bodyLines = lines.filter((line, index) => {
    if (index === 0 && line.startsWith('# ')) {
      return false;
    }
    return !/^\*\*([^*]+):\*\*\s*(.+)$/.test(line);
  });
  const bodyMarkdown = bodyLines.join('\n').trim();

  return {
    id,
    slug,
    title,
    status: metadata.status || 'Unknown',
    priority: metadata.priority || 'Unknown',
    dependsOnIds,
    blocksIds,
    markdown,
    bodyHtml: renderMarkdown(bodyMarkdown, 'issue')
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getIssueByIdMap(issues) {
  const map = new Map();
  for (const issue of issues) {
    map.set(issue.id, issue);
  }
  return map;
}

function computeLevels(issues, issueById) {
  const cache = new Map();
  const visiting = new Set();

  function levelFor(issue) {
    if (cache.has(issue.id)) {
      return cache.get(issue.id);
    }
    if (visiting.has(issue.id)) {
      return 0;
    }
    visiting.add(issue.id);

    let level = 0;
    for (const depId of issue.dependsOnIds) {
      const dep = issueById.get(depId);
      if (!dep) {
        continue;
      }
      level = Math.max(level, levelFor(dep) + 1);
    }

    visiting.delete(issue.id);
    cache.set(issue.id, level);
    return level;
  }

  for (const issue of issues) {
    levelFor(issue);
  }

  return cache;
}

function renderDependencyGraph(issues) {
  if (!issues.length) {
    return '<p class="muted">No issues found.</p>';
  }

  const issueById = getIssueByIdMap(issues);
  const levels = computeLevels(issues, issueById);
  const columns = new Map();

  for (const issue of issues) {
    const level = levels.get(issue.id) || 0;
    if (!columns.has(level)) {
      columns.set(level, []);
    }
    columns.get(level).push(issue);
  }

  const sortedColumnKeys = Array.from(columns.keys()).sort((a, b) => a - b);
  for (const key of sortedColumnKeys) {
    columns.get(key).sort((a, b) => a.id.localeCompare(b.id));
  }

  const nodeWidth = 280;
  const nodeHeight = 92;
  const colGap = 96;
  const rowGap = 34;
  const margin = 28;

  const positions = new Map();
  let maxRows = 0;
  sortedColumnKeys.forEach((key, colIndex) => {
    const column = columns.get(key);
    maxRows = Math.max(maxRows, column.length);
    column.forEach((issue, rowIndex) => {
      const x = margin + colIndex * (nodeWidth + colGap);
      const y = margin + rowIndex * (nodeHeight + rowGap);
      positions.set(issue.id, { x, y });
    });
  });

  const width = margin * 2 + sortedColumnKeys.length * nodeWidth + Math.max(0, sortedColumnKeys.length - 1) * colGap;
  const height = margin * 2 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * rowGap;

  const edges = [];
  for (const issue of issues) {
    const targetPos = positions.get(issue.id);
    if (!targetPos) {
      continue;
    }
    for (const depId of issue.dependsOnIds) {
      const dep = issueById.get(depId);
      const sourcePos = dep ? positions.get(dep.id) : null;
      if (!sourcePos) {
        continue;
      }
      const x1 = sourcePos.x + nodeWidth;
      const y1 = sourcePos.y + nodeHeight / 2;
      const x2 = targetPos.x;
      const y2 = targetPos.y + nodeHeight / 2;
      const c1x = x1 + Math.max(30, (x2 - x1) / 2);
      const c2x = x2 - Math.max(30, (x2 - x1) / 2);
      edges.push(`<path d="M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}" class="graph-edge" marker-end="url(#arrow)" />`);
    }
  }

  const nodes = issues
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((issue) => {
      const pos = positions.get(issue.id);
      const x = pos.x;
      const y = pos.y;
      const title = issue.title.length > 36 ? `${issue.title.slice(0, 33)}...` : issue.title;
      return [
        `<a href="issues/${escapeHtml(issue.slug)}.html">`,
        `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="3" class="graph-node" />`,
        `<text x="${x + 18}" y="${y + 31}" class="graph-id">Issue #${escapeHtml(issue.id)}</text>`,
        `<text x="${x + 18}" y="${y + 56}" class="graph-title">${escapeHtml(title)}</text>`,
        `<text x="${x + 18}" y="${y + 76}" class="graph-status">${escapeHtml(issue.status)}</text>`,
        '</a>'
      ].join('');
    })
    .join('\n');

  return [
    '<div class="graph-wrap">',
    `<svg class="dep-graph" viewBox="0 0 ${width} ${Math.max(height, 120)}" role="img" aria-label="Issue dependency graph">`,
    '<defs>',
    '<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">',
    '<path d="M 0 0 L 10 5 L 0 10 z" class="graph-arrow" />',
    '</marker>',
    '</defs>',
    '<g>',
    edges.join('\n'),
    '</g>',
    '<g>',
    nodes,
    '</g>',
    '</svg>',
    '</div>'
  ].join('\n');
}

function linkIssueIds(ids, issueById, pageType) {
  if (!ids.length) {
    return '—';
  }
  return ids
    .map((id) => {
      const issue = issueById.get(id);
      if (!issue) {
        return `#${escapeHtml(id)}`;
      }
      const href = pageType === 'index' ? `issues/${issue.slug}.html` : `${issue.slug}.html`;
      return `<a href="${escapeHtml(href)}">#${escapeHtml(issue.id)}</a>`;
    })
    .join(', ');
}

function renderLayout({ title, content, rootPath }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="stylesheet" href="${rootPath}styles.css" />`,
    '</head>',
    '<body>',
    '<div class="site-shell">',
    '<header class="site-header">',
    `<a class="brand" href="${rootPath}index.html">Wuhu <span>Issue Tracker</span></a>`,
    '<nav class="site-nav">',
    `<a href="${rootPath}index.html">Issues</a>`,
    `<a href="${rootPath}index.html#dependency-map">Dependencies</a>`,
    '</nav>',
    '</header>',
    '<main class="page">',
    content,
    '</main>',
    '</div>',
    '</body>',
    '</html>'
  ].join('\n');
}

function renderIndexPage(issues) {
  const issueById = getIssueByIdMap(issues);
  const openCount = issues.filter((issue) => toToken(issue.status) === 'open').length;
  const blockedCount = issues.filter((issue) => issue.dependsOnIds.length > 0).length;
  const readyCount = issues.filter((issue) => issue.dependsOnIds.length === 0).length;
  const highPriorityCount = issues.filter((issue) => toToken(issue.priority) === 'high').length;

  const rows = issues
    .map((issue) => {
      return [
        '<tr>',
        `<td><a class="issue-link" href="issues/${escapeHtml(issue.slug)}.html">#${escapeHtml(issue.id)}</a></td>`,
        `<td><a class="issue-link title-link" href="issues/${escapeHtml(issue.slug)}.html">${escapeHtml(issue.title)}</a></td>`,
        `<td><span class="pill pill-${toToken(issue.status)}">${escapeHtml(issue.status)}</span></td>`,
        `<td><span class="pill pill-${toToken(issue.priority)}">${escapeHtml(issue.priority)}</span></td>`,
        `<td>${linkIssueIds(issue.dependsOnIds, issueById, 'index')}</td>`,
        `<td>${linkIssueIds(issue.blocksIds, issueById, 'index')}</td>`,
        '</tr>'
      ].join('\n');
    })
    .join('\n');
  const mobileCards = issues
    .map((issue) => {
      return [
        '<article class="issue-card">',
        `<h3><a href="issues/${escapeHtml(issue.slug)}.html">#${escapeHtml(issue.id)} ${escapeHtml(issue.title)}</a></h3>`,
        '<div class="issue-card-meta">',
        `<div><span class="label">Status</span><span class="pill pill-${toToken(issue.status)}">${escapeHtml(issue.status)}</span></div>`,
        `<div><span class="label">Priority</span><span class="pill pill-${toToken(issue.priority)}">${escapeHtml(issue.priority)}</span></div>`,
        `<div><span class="label">Depends On</span><span>${linkIssueIds(issue.dependsOnIds, issueById, 'index')}</span></div>`,
        `<div><span class="label">Blocks</span><span>${linkIssueIds(issue.blocksIds, issueById, 'index')}</span></div>`,
        '</div>',
        '</article>'
      ].join('\n');
    })
    .join('\n');

  const graph = renderDependencyGraph(issues);

  const content = [
    '<header class="page-intro">',
    '<p class="kicker">Project Overview</p>',
    '<h1>Build priorities with clear dependency flow.</h1>',
    '<p class="lede">A lightweight static tracker with Scandinavian-style restraint: fewer colors, stronger hierarchy, and room for decisions to breathe.</p>',
    '<div class="stats-grid">',
    `<article class="stat"><p class="label">Total issues</p><p class="stat-value">${issues.length}</p></article>`,
    `<article class="stat"><p class="label">Open</p><p class="stat-value">${openCount}</p></article>`,
    `<article class="stat"><p class="label">Ready now</p><p class="stat-value">${readyCount}</p></article>`,
    `<article class="stat"><p class="label">Blocked</p><p class="stat-value">${blockedCount}</p></article>`,
    `<article class="stat"><p class="label">High priority</p><p class="stat-value">${highPriorityCount}</p></article>`,
    '</div>',
    '</header>',
    '<section class="panel">',
    '<div class="section-head">',
    '<h2>Issue Index</h2>',
    '<p class="muted">Derived directly from markdown metadata.</p>',
    '</div>',
    '<div class="table-wrap">',
    '<table>',
    '<thead>',
    '<tr><th>ID</th><th>Title</th><th>Status</th><th>Priority</th><th>Depends On</th><th>Blocks</th></tr>',
    '</thead>',
    '<tbody>',
    rows,
    '</tbody>',
    '</table>',
    '</div>',
    '<div class="issue-list-mobile">',
    mobileCards,
    '</div>',
    '</section>',
    '<section id="dependency-map" class="panel">',
    '<div class="section-head">',
    '<h2>Dependency Graph</h2>',
    '<p class="muted">Arrows run from prerequisite issue to dependent issue.</p>',
    '</div>',
    graph,
    '</section>'
  ].join('\n');

  return renderLayout({
    title: 'Wuhu Issue Tracker',
    content,
    rootPath: ''
  });
}

function renderIssuePage(issue, issueById) {
  const depends = linkIssueIds(issue.dependsOnIds, issueById, 'issue');
  const blocks = linkIssueIds(issue.blocksIds, issueById, 'issue');

  const content = [
    '<nav class="crumbs"><a href="../index.html">All Issues</a></nav>',
    '<header class="page-intro issue-intro">',
    `<p class="kicker">Issue #${escapeHtml(issue.id)}</p>`,
    `<h1>${escapeHtml(issue.title)}</h1>`,
    `<p class="lede">Status <span class="pill pill-${toToken(issue.status)}">${escapeHtml(issue.status)}</span> with <span class="pill pill-${toToken(issue.priority)}">${escapeHtml(issue.priority)}</span> priority.</p>`,
    '</header>',
    '<article class="panel issue">',
    '<div class="meta-grid">',
    `<div><span class="label">Status</span><span class="pill pill-${toToken(issue.status)}">${escapeHtml(issue.status)}</span></div>`,
    `<div><span class="label">Priority</span><span class="pill pill-${toToken(issue.priority)}">${escapeHtml(issue.priority)}</span></div>`,
    `<div><span class="label">Depends On</span><span>${depends}</span></div>`,
    `<div><span class="label">Blocks</span><span>${blocks}</span></div>`,
    '</div>',
    '<hr />',
    '<section class="md-content">',
    issue.bodyHtml,
    '</section>',
    '</article>'
  ].join('\n');

  return renderLayout({
    title: `Issue #${issue.id} - ${issue.title}`,
    content,
    rootPath: '../'
  });
}

function writeStyles() {
  const css = `:root {
  color-scheme: dark;
  --bg: #070707;
  --bg-elevated: #111112;
  --panel: #151516;
  --panel-soft: #1b1b1d;
  --text: #f2f2ed;
  --text-strong: #ffffff;
  --muted: #a1a29d;
  --line: rgba(255, 255, 255, 0.16);
  --line-soft: rgba(255, 255, 255, 0.09);
  --accent: #d1d4d0;
  --accent-strong: #f5f6f2;
  --shadow: 0 30px 80px rgba(0, 0, 0, 0.52);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  position: relative;
  padding: 0;
  background:
    radial-gradient(1100px 700px at 8% -15%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 55%),
    radial-gradient(900px 620px at 92% -18%, rgba(212, 220, 255, 0.12) 0%, rgba(212, 220, 255, 0) 52%),
    linear-gradient(180deg, #111112 0%, #090909 46%, #050505 100%);
  color: var(--text);
  font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.5;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, #000 18%, transparent 82%);
}

.site-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 1240px);
  margin: 0 auto;
  padding: 2.2rem 1.25rem 5rem;
}

.site-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.6rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line-soft);
}

.brand {
  color: var(--text-strong);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-size: 0.92rem;
}

.brand span {
  color: var(--muted);
  margin-left: 0.4rem;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.site-nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.88rem;
  letter-spacing: 0.02em;
}

.site-nav a:hover {
  color: var(--text-strong);
}

a {
  color: var(--accent-strong);
  text-decoration: none;
  transition: color 160ms ease;
}

a:hover {
  color: var(--text-strong);
}

.page {
  display: grid;
  gap: 2.2rem;
}

.page-intro {
  width: min(100%, 820px);
  margin: 0;
}

.page-intro h1 {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 4.15rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.034em;
  text-wrap: balance;
}

.kicker {
  margin: 0 0 1rem;
  color: var(--muted);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.lede {
  margin: 1.25rem 0 0;
  max-width: 68ch;
  color: var(--muted);
  font-size: 1.06rem;
  line-height: 1.58;
}

.stats-grid {
  margin-top: 2.2rem;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.8rem;
}

.stat {
  border: 1px solid var(--line-soft);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  padding: 0.9rem 1rem;
}

.stat .label {
  margin-bottom: 0.55rem;
}

.stat-value {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text-strong);
}

h1,
h2,
h3 {
  line-height: 1.1;
  margin-top: 0;
  margin-bottom: 0;
  letter-spacing: -0.02em;
}

h2 {
  font-size: clamp(1.4rem, 2vw, 2.1rem);
  font-weight: 420;
}

h3 {
  font-size: 1.12rem;
  font-weight: 500;
}

.muted {
  color: var(--muted);
}

.panel {
  border: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.005)),
    linear-gradient(120deg, rgba(255, 255, 255, 0.02), transparent 32%);
  padding: 1.55rem;
  box-shadow: var(--shadow);
}

.section-head {
  margin-bottom: 1.25rem;
}

.section-head p {
  margin: 0.7rem 0 0;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line-soft);
}

.issue-list-mobile {
  display: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
  background: rgba(8, 8, 8, 0.45);
}

th,
td {
  border-bottom: 1px solid var(--line-soft);
  text-align: left;
  padding: 0.78rem 0.75rem;
  vertical-align: top;
}

th {
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-weight: 500;
}

tbody tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

td {
  font-size: 0.96rem;
}

.issue-link {
  color: var(--accent-strong);
  font-weight: 450;
}

.title-link {
  color: var(--text);
}

.issue-card {
  border: 1px solid var(--line);
  padding: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012));
}

.issue-card h3 {
  margin: 0 0 0.85rem;
  font-size: 1rem;
}

.issue-card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.68rem;
}

.issue-card-meta div {
  border: 1px solid var(--line-soft);
  padding: 0.62rem 0.68rem;
  background: rgba(0, 0, 0, 0.28);
}

.crumbs {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-size: 0.73rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.4rem;
}

.meta-grid div {
  border: 1px solid var(--line-soft);
  padding: 0.72rem 0.8rem;
  background: rgba(0, 0, 0, 0.22);
}

.label {
  display: block;
  color: var(--muted);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 0.34rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0.14rem 0.56rem;
  border: 1px solid var(--line);
  color: var(--text);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(255, 255, 255, 0.03);
}

.pill-open {
  border-color: rgba(232, 244, 216, 0.48);
  background: rgba(181, 211, 132, 0.17);
  color: #e7f0d7;
}

.pill-high {
  border-color: rgba(255, 208, 192, 0.56);
  background: rgba(255, 154, 123, 0.2);
  color: #ffe5d8;
}

.issue-intro {
  margin-top: -0.1rem;
}

.md-content h1,
.md-content h2,
.md-content h3 {
  margin-top: 2.1rem;
  margin-bottom: 0.8rem;
  font-weight: 450;
  letter-spacing: -0.02em;
}

.md-content h1 {
  font-size: 1.85rem;
}

.md-content h2 {
  font-size: 1.35rem;
}

.md-content h3 {
  font-size: 1.06rem;
}

.md-content p,
.md-content ul,
.md-content ol {
  margin: 0.94rem 0;
  color: #d8d8d2;
  line-height: 1.66;
  max-width: 74ch;
}

.md-content ul,
.md-content ol {
  padding-left: 1.2rem;
}

.md-content pre {
  background: linear-gradient(180deg, #0b0b0c, #0a0a0a);
  border: 1px solid var(--line-soft);
  padding: 1rem 1.06rem;
  overflow-x: auto;
  max-width: 100%;
}

.md-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92rem;
}

.md-content pre code {
  color: #ecece7;
}

.md-content :not(pre) > code {
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.06);
  padding: 0.07rem 0.38rem;
}

.graph-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line-soft);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.44), rgba(0, 0, 0, 0.2));
  padding: 0.45rem;
}

.dep-graph {
  width: 100%;
  min-width: 640px;
  height: auto;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.05), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.02));
}

.graph-node {
  fill: #131315;
  stroke: rgba(255, 255, 255, 0.27);
  stroke-width: 1;
  transition: fill 150ms ease, stroke 150ms ease;
}

.dep-graph a:hover .graph-node {
  fill: #1b1c20;
  stroke: rgba(255, 255, 255, 0.4);
}

.graph-edge {
  fill: none;
  stroke: rgba(229, 234, 255, 0.44);
  stroke-width: 1.7;
}

.graph-arrow {
  fill: rgba(229, 234, 255, 0.44);
}

.graph-id {
  fill: #cad0ca;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.graph-title {
  fill: #f2f2ee;
  font-size: 14px;
}

.graph-status {
  fill: #8f918d;
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

hr {
  border: none;
  border-top: 1px solid var(--line-soft);
  margin: 1.2rem 0;
}

@media (prefers-reduced-motion: no-preference) {
  .page > * {
    animation: rise 560ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }

  .page > *:nth-child(2) {
    animation-delay: 70ms;
  }

  .page > *:nth-child(3) {
    animation-delay: 120ms;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .site-shell {
    padding: 1.2rem 0.85rem 2.8rem;
  }

  .site-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1.55rem;
  }

  .page {
    gap: 1.35rem;
  }

  .page-intro h1 {
    font-size: clamp(1.82rem, 8.8vw, 2.54rem);
    line-height: 1.04;
  }

  .lede {
    font-size: 1rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.62rem;
    margin-top: 1.4rem;
  }

  .panel {
    padding: 1rem;
  }

  .table-wrap {
    display: none;
  }

  .issue-list-mobile {
    display: grid;
    gap: 0.68rem;
  }

  .issue-card-meta {
    grid-template-columns: 1fr;
  }

  .meta-grid {
    grid-template-columns: 1fr;
    margin-bottom: 1rem;
  }

  .dep-graph {
    min-width: 560px;
  }
}
`;

  fs.writeFileSync(path.join(DIST_DIR, 'styles.css'), css, 'utf8');
}

function main() {
  if (!fs.existsSync(ISSUES_DIR)) {
    throw new Error(`Missing issues directory: ${ISSUES_DIR}`);
  }

  const issueFiles = fs
    .readdirSync(ISSUES_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort((a, b) => parseIssueId(a).localeCompare(parseIssueId(b)));

  const issues = issueFiles.map((fileName) => {
    const markdown = fs.readFileSync(path.join(ISSUES_DIR, fileName), 'utf8');
    return parseIssue(fileName, markdown);
  });

  const issueById = getIssueByIdMap(issues);

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_ISSUES_DIR);

  writeStyles();

  const indexHtml = renderIndexPage(issues);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml, 'utf8');

  for (const issue of issues) {
    const issueHtml = renderIssuePage(issue, issueById);
    fs.writeFileSync(path.join(DIST_ISSUES_DIR, `${issue.slug}.html`), issueHtml, 'utf8');
  }

  console.log(`Built ${issues.length} issues into ${DIST_DIR}`);
}

main();
