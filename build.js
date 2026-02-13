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

  const nodeWidth = 220;
  const nodeHeight = 68;
  const colGap = 120;
  const rowGap = 28;
  const margin = 24;

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
      const title = issue.title.length > 34 ? `${issue.title.slice(0, 31)}...` : issue.title;
      return [
        `<a href="issues/${escapeHtml(issue.slug)}.html">`,
        `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="12" class="graph-node" />`,
        `<text x="${x + 14}" y="${y + 26}" class="graph-id">#${escapeHtml(issue.id)}</text>`,
        `<text x="${x + 14}" y="${y + 46}" class="graph-title">${escapeHtml(title)}</text>`,
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
    '<main class="container">',
    content,
    '</main>',
    '</body>',
    '</html>'
  ].join('\n');
}

function renderIndexPage(issues) {
  const issueById = getIssueByIdMap(issues);
  const rows = issues
    .map((issue) => {
      return [
        '<tr>',
        `<td><a href="issues/${escapeHtml(issue.slug)}.html">#${escapeHtml(issue.id)}</a></td>`,
        `<td><a href="issues/${escapeHtml(issue.slug)}.html">${escapeHtml(issue.title)}</a></td>`,
        `<td>${escapeHtml(issue.status)}</td>`,
        `<td>${escapeHtml(issue.priority)}</td>`,
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
        `<div><span class="label">Status</span><span>${escapeHtml(issue.status)}</span></div>`,
        `<div><span class="label">Priority</span><span>${escapeHtml(issue.priority)}</span></div>`,
        `<div><span class="label">Depends On</span><span>${linkIssueIds(issue.dependsOnIds, issueById, 'index')}</span></div>`,
        `<div><span class="label">Blocks</span><span>${linkIssueIds(issue.blocksIds, issueById, 'index')}</span></div>`,
        '</div>',
        '</article>'
      ].join('\n');
    })
    .join('\n');

  const graph = renderDependencyGraph(issues);

  const content = [
    '<header class="header">',
    '<h1>Wuhu Issue Tracker</h1>',
    '<p class="muted">Static site generated from markdown issues.</p>',
    '</header>',
    '<section class="card">',
    '<h2>Issues</h2>',
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
    '<section class="card">',
    '<h2>Dependency Graph</h2>',
    '<p class="muted">Arrows point from prerequisite issue to dependent issue.</p>',
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
    '<article class="card issue">',
    `<h1>#${escapeHtml(issue.id)} ${escapeHtml(issue.title)}</h1>`,
    '<div class="meta-grid">',
    `<div><span class="label">Status</span><span>${escapeHtml(issue.status)}</span></div>`,
    `<div><span class="label">Priority</span><span>${escapeHtml(issue.priority)}</span></div>`,
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
  --bg: #0f1115;
  --card: #161a22;
  --muted: #a6b0c0;
  --text: #e8edf7;
  --line: #2a3140;
  --accent: #7dd3fc;
  --accent-soft: rgba(125, 211, 252, 0.18);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: radial-gradient(circle at top right, #1b2130 0%, #0f1115 45%);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.container {
  width: min(100%, 960px);
  margin: 0 auto;
  padding: 1rem;
}

.header {
  margin: 1.5rem 0 1rem;
}

h1,
h2,
h3 {
  line-height: 1.25;
  margin-top: 0;
}

.card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 1rem;
  margin: 1rem 0;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.table-wrap {
  overflow-x: auto;
}

.issue-list-mobile {
  display: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

th,
td {
  border-bottom: 1px solid var(--line);
  text-align: left;
  padding: 0.65rem 0.5rem;
  vertical-align: top;
}

th {
  color: var(--muted);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.issue-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.01);
}

.issue-card h3 {
  margin: 0 0 0.7rem;
  font-size: 1rem;
}

.issue-card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.issue-card-meta div {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.55rem 0.6rem;
  background: rgba(0, 0, 0, 0.12);
}

.muted {
  color: var(--muted);
}

.crumbs {
  margin: 1rem 0;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.meta-grid div {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  background: rgba(255, 255, 255, 0.01);
}

.label {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.2rem;
}

.md-content h1,
.md-content h2,
.md-content h3 {
  margin-top: 1.2rem;
}

.md-content p,
.md-content ul,
.md-content ol {
  margin: 0.8rem 0;
}

.md-content pre {
  background: #0a0d12;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.85rem;
  overflow-x: auto;
}

.md-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.graph-wrap {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.dep-graph {
  width: 100%;
  min-width: 400px;
  height: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.03), rgba(125, 211, 252, 0.01));
}

.graph-node {
  fill: #141a24;
  stroke: #39475f;
  stroke-width: 1.3;
}

.graph-edge {
  fill: none;
  stroke: #5b6f8f;
  stroke-width: 1.8;
}

.graph-arrow {
  fill: #5b6f8f;
}

.graph-id {
  fill: var(--accent);
  font-size: 14px;
  font-weight: 600;
}

.graph-title {
  fill: var(--text);
  font-size: 12px;
}

hr {
  border: none;
  border-top: 1px solid var(--line);
  margin: 1rem 0;
}

@media (max-width: 720px) {
  .container {
    padding: 0.8rem;
  }

  .card {
    padding: 0.85rem;
    border-radius: 12px;
  }

  .table-wrap {
    display: none;
  }

  .issue-list-mobile {
    display: grid;
    gap: 0.7rem;
  }

  .issue-card-meta {
    grid-template-columns: 1fr;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }

  .dep-graph {
    min-width: 320px;
  }

  th,
  td {
    padding: 0.55rem 0.45rem;
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
