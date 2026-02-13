#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ISSUES_DIR = path.join(ROOT, "issues");
const DIST_DIR = path.join(ROOT, "dist");
const DIST_ISSUES_DIR = path.join(DIST_DIR, "issues");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripMdExtension(fileName) {
  return fileName.replace(/\.md$/i, "");
}

function toToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function parseIssueFileName(fileName) {
  if (!fileName.endsWith(".md")) {
    throw new Error(`Issue file must be .md: ${fileName}`);
  }
  const base = path.basename(fileName);
  const match = base.match(/^(\d{4})-([^.]+)\.md$/);
  if (!match) {
    throw new Error(
      `Issue file must match "[digits]-[title].md" with exactly 4 digits: ${fileName}`,
    );
  }
  const idText = match[1];
  const number = Number.parseInt(idText, 10);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Invalid issue id number in filename: ${fileName}`);
  }
  return {
    idText,
    number,
    slug: stripMdExtension(base),
  };
}

function normalizeLink(url, pageType) {
  if (
    /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || url.startsWith("#")
  ) {
    return url;
  }

  if (url.endsWith(".md")) {
    const base = path.basename(url);
    const htmlName = stripMdExtension(base) + ".html";
    return pageType === "index" ? `issues/${htmlName}` : htmlName;
  }

  return url;
}

function issueHref(issue, pageType) {
  return pageType === "index"
    ? `issues/${issue.slug}.html`
    : `${issue.slug}.html`;
}

function renderInline(text, pageType) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const normalized = normalizeLink(url, pageType);
    const external = /^https?:\/\//i.test(normalized);
    const attrs = external ? ' target="_blank" rel="noreferrer noopener"' : "";
    return `<a href="${escapeHtml(normalized)}"${attrs}>${label}</a>`;
  });

  return html;
}

function renderMarkdown(markdown, pageType) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inCode = false;
  let codeLang = "";
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    out.push(`<p>${renderInline(paragraph.join(" "), pageType)}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) {
      return;
    }
    out.push(listType === "ol" ? "</ol>" : "</ul>");
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inCode) {
      if (trimmed.startsWith("```")) {
        out.push("</code></pre>");
        inCode = false;
        codeLang = "";
      } else {
        out.push(`${escapeHtml(line)}\n`);
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeList();
      codeLang = trimmed.slice(3).trim();
      const className = codeLang
        ? ` class="language-${escapeHtml(codeLang)}"`
        : "";
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
      if (listType && listType !== "ul") {
        closeList();
      }
      if (!listType) {
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${renderInline(ulMatch[1], pageType)}</li>`);
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        closeList();
      }
      if (!listType) {
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${renderInline(olMatch[1], pageType)}</li>`);
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      closeList();
      out.push("<hr />");
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  if (inCode) {
    out.push("</code></pre>");
  }

  return out.join("\n");
}

function splitFrontMatter(markdown, fileName) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(
      `Missing YAML front matter (expected leading ---): ${fileName}`,
    );
  }
  const lines = normalized.split("\n");
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    throw new Error(
      `Unterminated YAML front matter (missing closing ---): ${fileName}`,
    );
  }
  const yamlLines = lines.slice(1, endIndex);
  const bodyLines = lines.slice(endIndex + 1);
  const body = bodyLines.join("\n").replace(/^\n+/, "");
  return { yaml: yamlLines.join("\n"), body };
}

function parseIssueFrontMatter(yaml, fileName) {
  const allowedKeys = new Set(["title", "status", "depends_on"]);
  const metadata = {};
  let currentKey = null;

  const yamlLines = yaml.split("\n");
  for (let i = 0; i < yamlLines.length; i++) {
    const rawLine = yamlLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (/^\s+-\s+/.test(rawLine)) {
      if (currentKey !== "depends_on") {
        throw new Error(
          `Unexpected list item in front matter (${fileName}:${i + 1})`,
        );
      }
      const value = trimmed.replace(/^-+\s+/, "").trim();
      if (!metadata.depends_on) {
        metadata.depends_on = [];
      }
      metadata.depends_on.push(value);
      continue;
    }

    const match = rawLine.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) {
      throw new Error(
        `Invalid YAML front matter line (${fileName}:${i + 1}): ${rawLine}`,
      );
    }

    const key = match[1];
    const value = match[2];
    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown front matter key "${key}" in ${fileName}`);
    }
    currentKey = key;

    if (key === "depends_on") {
      if (!value) {
        metadata.depends_on = [];
        continue;
      }
      const inline = value.trim();
      if (inline === "[]") {
        metadata.depends_on = [];
        continue;
      }
      const arrayMatch = inline.match(/^\[(.*)\]$/);
      if (!arrayMatch) {
        throw new Error(`depends_on must be a YAML array in ${fileName}`);
      }
      const inner = arrayMatch[1].trim();
      if (!inner) {
        metadata.depends_on = [];
        continue;
      }
      metadata.depends_on = inner.split(",").map((item) => item.trim());
      continue;
    }

    const scalar = value.trim();
    if (!scalar) {
      throw new Error(`Front matter "${key}" must not be empty in ${fileName}`);
    }
    const unquoted = scalar.replace(/^['"]|['"]$/g, "");
    metadata[key] = unquoted;
  }

  if (!metadata.title) {
    throw new Error(`Front matter must include "title" in ${fileName}`);
  }
  if (!metadata.status) {
    throw new Error(`Front matter must include "status" in ${fileName}`);
  }
  const statusToken = String(metadata.status).trim().toLowerCase();
  if (statusToken !== "open" && statusToken !== "closed") {
    throw new Error(`status must be "open" or "closed" in ${fileName}`);
  }

  const dependsOnRaw = metadata.depends_on || [];
  if (!Array.isArray(dependsOnRaw)) {
    throw new Error(`depends_on must be an array in ${fileName}`);
  }
  const dependsOnNumbers = dependsOnRaw
    .filter((value) =>
      value !== null && value !== undefined && String(value).trim() !== ""
    )
    .map((value) => {
      const asNumber = Number.parseInt(String(value).trim(), 10);
      if (!Number.isInteger(asNumber)) {
        throw new Error(`depends_on must contain integers in ${fileName}`);
      }
      return asNumber;
    });

  const unique = Array.from(new Set(dependsOnNumbers)).sort((a, b) => a - b);

  return {
    title: String(metadata.title).trim(),
    status: statusToken === "open" ? "Open" : "Closed",
    dependsOnNumbers: unique,
  };
}

function parseIssue(fileName, markdown) {
  const fileInfo = parseIssueFileName(fileName);
  const { yaml, body } = splitFrontMatter(markdown, fileName);
  const metadata = parseIssueFrontMatter(yaml, fileName);
  const bodyMarkdown = body.trim();

  return {
    idText: fileInfo.idText,
    number: fileInfo.number,
    slug: fileInfo.slug,
    title: metadata.title,
    status: metadata.status,
    dependsOnNumbers: metadata.dependsOnNumbers,
    blocksNumbers: [],
    markdown,
    bodyMarkdown,
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function formatIssueKey(idText) {
  return `WUHU-${idText}`;
}

function formatIssueKeyFromNumber(number) {
  return `WUHU-${String(number).padStart(4, "0")}`;
}

function getIssueByNumberMap(issues) {
  const map = new Map();
  for (const issue of issues) {
    map.set(issue.number, issue);
  }
  return map;
}

function verifyIssues(issues, issueFiles) {
  const seen = new Set();
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    if (seen.has(issue.number)) {
      throw new Error(`Duplicate issue number ${formatIssueKey(issue.idText)}`);
    }
    seen.add(issue.number);
    if (!issue.title || !issue.title.trim()) {
      throw new Error(`Missing title for ${issueFiles[i]}`);
    }
    if (issue.dependsOnNumbers.includes(issue.number)) {
      throw new Error(
        `Issue ${formatIssueKey(issue.idText)} cannot depend on itself`,
      );
    }
  }
}

function assignBlocksAndVerifyDeps(issues) {
  const issueByNumber = getIssueByNumberMap(issues);
  const blocksByNumber = new Map();

  for (const issue of issues) {
    for (const dep of issue.dependsOnNumbers) {
      const target = issueByNumber.get(dep);
      if (!target) {
        throw new Error(
          `Unknown dependency ${formatIssueKeyFromNumber(dep)} referenced by ${
            formatIssueKey(issue.idText)
          }`,
        );
      }
      if (!blocksByNumber.has(dep)) {
        blocksByNumber.set(dep, []);
      }
      blocksByNumber.get(dep).push(issue.number);
    }
  }

  for (const issue of issues) {
    const blocks = blocksByNumber.get(issue.number) || [];
    issue.blocksNumbers = Array.from(new Set(blocks)).sort((a, b) => a - b);
  }

  return issueByNumber;
}

function computeLevels(issues, issueByNumber) {
  const cache = new Map();
  const visiting = new Set();

  function levelFor(issue) {
    if (cache.has(issue.number)) {
      return cache.get(issue.number);
    }
    if (visiting.has(issue.number)) {
      return 0;
    }
    visiting.add(issue.number);

    let level = 0;
    for (const depNumber of issue.dependsOnNumbers) {
      const dep = issueByNumber.get(depNumber);
      if (!dep) {
        continue;
      }
      level = Math.max(level, levelFor(dep) + 1);
    }

    visiting.delete(issue.number);
    cache.set(issue.number, level);
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

  const issueByNumber = getIssueByNumberMap(issues);
  const levels = computeLevels(issues, issueByNumber);
  const columns = new Map();

  for (const issue of issues) {
    const level = levels.get(issue.number) || 0;
    if (!columns.has(level)) {
      columns.set(level, []);
    }
    columns.get(level).push(issue);
  }

  const sortedColumnKeys = Array.from(columns.keys()).sort((a, b) => a - b);
  for (const key of sortedColumnKeys) {
    columns.get(key).sort((a, b) => a.number - b.number);
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
      positions.set(issue.number, { x, y });
    });
  });

  const width = margin * 2 + sortedColumnKeys.length * nodeWidth +
    Math.max(0, sortedColumnKeys.length - 1) * colGap;
  const height = margin * 2 + maxRows * nodeHeight +
    Math.max(0, maxRows - 1) * rowGap;

  const edges = [];
  for (const issue of issues) {
    const targetPos = positions.get(issue.number);
    if (!targetPos) {
      continue;
    }
    for (const depNumber of issue.dependsOnNumbers) {
      const dep = issueByNumber.get(depNumber);
      const sourcePos = dep ? positions.get(dep.number) : null;
      if (!sourcePos) {
        continue;
      }
      const x1 = sourcePos.x + nodeWidth;
      const y1 = sourcePos.y + nodeHeight / 2;
      const x2 = targetPos.x;
      const y2 = targetPos.y + nodeHeight / 2;
      const c1x = x1 + Math.max(30, (x2 - x1) / 2);
      const c2x = x2 - Math.max(30, (x2 - x1) / 2);
      edges.push(
        `<path d="M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}" class="graph-edge" marker-end="url(#arrow)" />`,
      );
    }
  }

  const nodes = issues
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((issue) => {
      const pos = positions.get(issue.number);
      const x = pos.x;
      const y = pos.y;
      const title = issue.title.length > 36
        ? `${issue.title.slice(0, 33)}...`
        : issue.title;
      return [
        `<a href="issues/${escapeHtml(issue.slug)}.html">`,
        `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="3" class="graph-node" />`,
        `<text x="${x + 18}" y="${y + 31}" class="graph-id">${
          escapeHtml(formatIssueKey(issue.idText))
        }</text>`,
        `<text x="${x + 18}" y="${y + 56}" class="graph-title">${
          escapeHtml(title)
        }</text>`,
        `<text x="${x + 18}" y="${y + 76}" class="graph-status">${
          escapeHtml(issue.status)
        }</text>`,
        "</a>",
      ].join("");
    })
    .join("\n");

  return [
    '<div class="graph-wrap">',
    `<svg class="dep-graph" viewBox="0 0 ${width} ${
      Math.max(height, 120)
    }" role="img" aria-label="Issue dependency graph">`,
    "<defs>",
    '<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">',
    '<path d="M 0 0 L 10 5 L 0 10 z" class="graph-arrow" />',
    "</marker>",
    "</defs>",
    "<g>",
    edges.join("\n"),
    "</g>",
    "<g>",
    nodes,
    "</g>",
    "</svg>",
    "</div>",
  ].join("\n");
}

function linkIssueIds(numbers, issueByNumber, pageType) {
  if (!numbers.length) {
    return "—";
  }
  return numbers
    .map((number) => {
      const issue = issueByNumber.get(number);
      if (!issue) {
        return escapeHtml(formatIssueKeyFromNumber(number));
      }
      const href = issueHref(issue, pageType);
      return `<a href="${escapeHtml(href)}">${
        escapeHtml(formatIssueKey(issue.idText))
      }</a>`;
    })
    .join(", ");
}

function renderLayout({ title, content, rootPath }) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="stylesheet" href="${rootPath}styles.css" />`,
    "</head>",
    "<body>",
    '<div class="site-shell">',
    '<header class="site-header">',
    `<a class="brand" href="${rootPath}index.html">Wuhu <span>Issue Tracker</span></a>`,
    '<nav class="site-nav">',
    `<a href="${rootPath}index.html">Issues</a>`,
    `<a href="${rootPath}index.html#dependency-map">Dependencies</a>`,
    "</nav>",
    "</header>",
    '<main class="page">',
    content,
    "</main>",
    "</div>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderIndexPage(issues) {
  const issueByNumber = getIssueByNumberMap(issues);
  const openCount =
    issues.filter((issue) => toToken(issue.status) === "open").length;
  const closedCount =
    issues.filter((issue) => toToken(issue.status) === "closed").length;
  const blockedCount =
    issues.filter((issue) => issue.dependsOnNumbers.length > 0).length;
  const readyCount =
    issues.filter((issue) => issue.dependsOnNumbers.length === 0).length;

  const rows = issues
    .map((issue) => {
      return [
        "<tr>",
        `<td><a class="issue-link" href="issues/${
          escapeHtml(issue.slug)
        }.html">${escapeHtml(formatIssueKey(issue.idText))}</a></td>`,
        `<td><a class="issue-link title-link" href="issues/${
          escapeHtml(issue.slug)
        }.html">${escapeHtml(issue.title)}</a></td>`,
        `<td><span class="pill pill-${toToken(issue.status)}">${
          escapeHtml(issue.status)
        }</span></td>`,
        `<td>${
          linkIssueIds(issue.dependsOnNumbers, issueByNumber, "index")
        }</td>`,
        `<td>${linkIssueIds(issue.blocksNumbers, issueByNumber, "index")}</td>`,
        "</tr>",
      ].join("\n");
    })
    .join("\n");
  const mobileCards = issues
    .map((issue) => {
      return [
        '<article class="issue-card">',
        `<h3><a href="issues/${escapeHtml(issue.slug)}.html">${
          escapeHtml(formatIssueKey(issue.idText))
        } ${escapeHtml(issue.title)}</a></h3>`,
        '<div class="issue-card-meta">',
        `<div><span class="label">Status</span><span class="pill pill-${
          toToken(issue.status)
        }">${escapeHtml(issue.status)}</span></div>`,
        `<div><span class="label">Depends On</span><span>${
          linkIssueIds(issue.dependsOnNumbers, issueByNumber, "index")
        }</span></div>`,
        `<div><span class="label">Blocks</span><span>${
          linkIssueIds(issue.blocksNumbers, issueByNumber, "index")
        }</span></div>`,
        "</div>",
        "</article>",
      ].join("\n");
    })
    .join("\n");

  const graph = renderDependencyGraph(issues);

  const content = [
    '<header class="page-intro">',
    '<p class="kicker">Issue Tracker</p>',
    "<h1>Wuhu Issue Tracker</h1>",
    '<p class="lede">Static site generated from <code>issues/*.md</code> with status and dependency relationships.</p>',
    '<div class="overview-meta">',
    `<p><span class="label">Total</span><strong>${issues.length}</strong></p>`,
    `<p><span class="label">Open</span><strong>${openCount}</strong></p>`,
    `<p><span class="label">Closed</span><strong>${closedCount}</strong></p>`,
    `<p><span class="label">Ready</span><strong>${readyCount}</strong></p>`,
    `<p><span class="label">Blocked</span><strong>${blockedCount}</strong></p>`,
    "</div>",
    "</header>",
    '<section class="panel">',
    '<div class="section-head">',
    "<h2>Issues</h2>",
    '<p class="muted">Generated from markdown metadata.</p>',
    "</div>",
    '<div class="table-wrap">',
    "<table>",
    "<thead>",
    "<tr><th>ID</th><th>Title</th><th>Status</th><th>Depends On</th><th>Blocks</th></tr>",
    "</thead>",
    "<tbody>",
    rows,
    "</tbody>",
    "</table>",
    "</div>",
    '<div class="issue-list-mobile">',
    mobileCards,
    "</div>",
    "</section>",
    '<section id="dependency-map" class="panel">',
    '<div class="section-head">',
    "<h2>Dependency Graph</h2>",
    '<p class="muted">Arrows run from prerequisite issue to dependent issue.</p>',
    "</div>",
    graph,
    "</section>",
  ].join("\n");

  return renderLayout({
    title: "Wuhu Issue Tracker",
    content,
    rootPath: "",
  });
}

function renderIssuePage(issue, issueByNumber) {
  const depends = linkIssueIds(issue.dependsOnNumbers, issueByNumber, "issue");
  const blocks = linkIssueIds(issue.blocksNumbers, issueByNumber, "issue");
  const bodyHtml = renderMarkdown(issue.bodyMarkdown, "issue");

  const content = [
    '<nav class="crumbs"><a href="../index.html">All Issues</a></nav>',
    '<header class="page-intro issue-intro">',
    `<p class="kicker">${escapeHtml(formatIssueKey(issue.idText))}</p>`,
    `<h1>${escapeHtml(issue.title)}</h1>`,
    `<p class="lede">Status <span class="pill pill-${toToken(issue.status)}">${
      escapeHtml(issue.status)
    }</span>.</p>`,
    "</header>",
    '<article class="panel issue">',
    '<div class="meta-grid">',
    `<div><span class="label">Status</span><span class="pill pill-${
      toToken(issue.status)
    }">${escapeHtml(issue.status)}</span></div>`,
    `<div><span class="label">Depends On</span><span>${depends}</span></div>`,
    `<div><span class="label">Blocks</span><span>${blocks}</span></div>`,
    "</div>",
    "<hr />",
    '<section class="md-content">',
    bodyHtml,
    "</section>",
    "</article>",
  ].join("\n");

  return renderLayout({
    title: `${formatIssueKey(issue.idText)} - ${issue.title}`,
    content,
    rootPath: "../",
  });
}

function writeStyles() {
  const css = `:root {
  --bg: #f7f4ef;
  --bg-soft: #f3efe8;
  --surface: #ffffff;
  --surface-soft: #fcfbf8;
  --text: #111111;
  --muted: #66625d;
  --line: #ddd6cc;
  --line-strong: #c8bdb0;
  --accent: #ef6d00;
  --accent-soft: rgba(239, 109, 0, 0.16);
  --shadow: 0 18px 38px rgba(17, 17, 17, 0.07);
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
  padding: 0;
  color: var(--text);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.45;
  background: linear-gradient(180deg, var(--bg-soft) 0%, #f7f5f0 24%, #f8f6f2 100%);
}

.site-shell {
  width: min(100%, 1260px);
  margin: 0 auto;
  padding: 2.25rem 1.55rem 6rem;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid var(--line);
}

.brand {
  color: var(--text);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-size: 0.86rem;
}

.brand span {
  color: var(--muted);
  margin-left: 0.38rem;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.site-nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.84rem;
  letter-spacing: 0.02em;
}

a {
  color: #24201c;
  text-decoration: none;
  transition: color 140ms ease;
}

a:hover {
  color: var(--accent);
}

.site-nav a:hover {
  color: var(--text);
}

.page {
  display: grid;
  gap: 3.4rem;
  margin-top: 2.95rem;
}

.page-intro {
  width: min(100%, 860px);
  margin: 0;
}

.kicker {
  margin: 0 0 0.95rem;
  color: var(--muted);
  font-size: 0.69rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.page-intro h1 {
  margin: 0;
  font-size: clamp(2.25rem, 5vw, 5.45rem);
  font-weight: 400;
  letter-spacing: -0.042em;
  line-height: 0.95;
}

.lede {
  margin: 1.55rem 0 0;
  color: #4f4b46;
  max-width: 72ch;
  font-size: 1.08rem;
  line-height: 1.67;
}

h1,
h2,
h3 {
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1.08;
  letter-spacing: -0.02em;
  font-weight: 450;
}

h2 {
  font-size: clamp(1.34rem, 2vw, 2.05rem);
}

h3 {
  font-size: 1.03rem;
}

.overview-meta {
  margin-top: 2rem;
  padding: 1.2rem 0 0;
  border-top: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.55rem;
}

.overview-meta p {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 0.48rem;
}

.overview-meta strong {
  font-size: 1.34rem;
  font-weight: 500;
  color: #1d1a16;
  letter-spacing: -0.02em;
}

.panel {
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 1.9rem;
  box-shadow: var(--shadow);
}

.section-head {
  margin-bottom: 1.4rem;
}

.section-head p {
  margin: 0.58rem 0 0;
}

.muted {
  color: var(--muted);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
}

.issue-list-mobile {
  display: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 740px;
  background: #ffffff;
}

th,
td {
  border-bottom: 1px solid var(--line);
  text-align: left;
  padding: 0.95rem 0.9rem;
  vertical-align: top;
  font-size: 0.95rem;
}

th {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-size: 0.68rem;
  font-weight: 500;
  background: #faf8f3;
}

tbody tr:hover td {
  background: #f9f5ef;
}

.issue-link {
  color: #1f1b18;
  font-weight: 500;
}

.title-link {
  font-weight: 450;
}

.issue-card {
  border: 1px solid var(--line);
  padding: 1.1rem;
  background: #fff;
}

.issue-card h3 {
  margin: 0 0 0.72rem;
}

.issue-card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.62rem;
}

.issue-card-meta div {
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  padding: 0.56rem 0.02rem 0;
}

.crumbs {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.2rem;
}

.meta-grid div {
  border: 1px solid var(--line);
  background: #fffdfa;
  padding: 0.78rem 0.82rem;
}

.label {
  display: block;
  color: var(--muted);
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 0.34rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--line-strong);
  background: #f8f5f0;
  color: #403a34;
  font-size: 0.72rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.pill-open {
  border-color: #de6a09;
  background: rgba(239, 109, 0, 0.18);
  color: #883700;
}

.pill-closed {
  border-color: #b9b2a8;
  background: rgba(185, 178, 168, 0.2);
  color: #5c5751;
}

.issue-intro {
  margin-top: -0.15rem;
}

.md-content h1,
.md-content h2,
.md-content h3 {
  margin-top: 2rem;
  margin-bottom: 0.74rem;
  letter-spacing: -0.022em;
}

.md-content h1 {
  font-size: 1.86rem;
}

.md-content h2 {
  font-size: 1.31rem;
}

.md-content h3 {
  font-size: 1.03rem;
}

.md-content p,
.md-content ul,
.md-content ol {
  margin: 0.92rem 0;
  max-width: 74ch;
  color: #282521;
  line-height: 1.67;
}

.md-content ul,
.md-content ol {
  padding-left: 1.18rem;
}

.md-content pre {
  border: 1px solid #d6cfc5;
  background: #f8f4ee;
  padding: 0.95rem;
  overflow-x: auto;
}

.md-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9rem;
}

.md-content :not(pre) > code {
  border: 1px solid #dfd6cb;
  background: #f7f3ec;
  padding: 0.05rem 0.34rem;
}

.graph-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line);
  background: #fffdf9;
  padding: 0.45rem;
}

.dep-graph {
  width: 100%;
  min-width: 640px;
  height: auto;
  background: linear-gradient(180deg, #fffdf9, #fbf6ee);
}

.graph-node {
  fill: #ffffff;
  stroke: #d2c7b9;
  stroke-width: 1;
  transition: fill 120ms ease, stroke 120ms ease;
}

.dep-graph a:hover .graph-node {
  fill: #fff8f2;
  stroke: #df6a09;
}

.graph-edge {
  fill: none;
  stroke: rgba(239, 109, 0, 0.74);
  stroke-width: 1.65;
}

.graph-arrow {
  fill: rgba(239, 109, 0, 0.74);
}

.graph-id {
  fill: #963f00;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.graph-title {
  fill: #1f1b17;
  font-size: 14px;
}

.graph-status {
  fill: #746e68;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

hr {
  border: none;
  border-top: 1px solid var(--line);
  margin: 1.2rem 0;
}

@media (prefers-reduced-motion: no-preference) {
  .page > * {
    animation: fadein 360ms ease both;
  }

  .page > *:nth-child(2) {
    animation-delay: 40ms;
  }
}

@keyframes fadein {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .site-shell {
    padding: 1.25rem 0.9rem 2.8rem;
  }

  .site-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.74rem;
  }

  .page {
    margin-top: 1.6rem;
    gap: 1.4rem;
  }

  .page-intro h1 {
    font-size: clamp(1.8rem, 10vw, 2.56rem);
    line-height: 1.01;
  }

  .lede {
    font-size: 0.98rem;
  }

  .overview-meta {
    gap: 0.72rem 0.96rem;
  }

  .panel {
    padding: 1.05rem;
  }

  .table-wrap {
    display: none;
  }

  .issue-list-mobile {
    display: grid;
    gap: 0.66rem;
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

  fs.writeFileSync(path.join(DIST_DIR, "styles.css"), css, "utf8");
}

function main() {
  if (!fs.existsSync(ISSUES_DIR)) {
    throw new Error(`Missing issues directory: ${ISSUES_DIR}`);
  }

  const issueFiles = fs
    .readdirSync(ISSUES_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) =>
      parseIssueFileName(a).number - parseIssueFileName(b).number
    );

  const issues = issueFiles.map((fileName) => {
    const markdown = fs.readFileSync(path.join(ISSUES_DIR, fileName), "utf8");
    return parseIssue(fileName, markdown);
  });

  verifyIssues(issues, issueFiles);
  const issueByNumber = assignBlocksAndVerifyDeps(issues);

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_ISSUES_DIR);

  writeStyles();

  const indexHtml = renderIndexPage(issues);
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), indexHtml, "utf8");

  for (const issue of issues) {
    const issueHtml = renderIssuePage(issue, issueByNumber);
    fs.writeFileSync(
      path.join(DIST_ISSUES_DIR, `${issue.slug}.html`),
      issueHtml,
      "utf8",
    );
  }

  console.log(`Built ${issues.length} issues into ${DIST_DIR}`);
}

main();
