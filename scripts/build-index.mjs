#!/usr/bin/env node
/**
 * Generate .well-known/agent-skills/index.json — the Agent Skills discovery
 * document, schema 0.2.0.
 *
 * Serve it from https://relintio.com/.well-known/agent-skills/index.json and
 * `npx skills add relintio.com` resolves this repository's skills from our own
 * domain, with no GitHub round trip and no dependence on the repo name.
 *
 * Each entry carries a SHA-256 digest of the artifact it points at, and the
 * CLI rejects any entry whose digest does not match what it downloads. So this
 * file MUST be regenerated whenever a SKILL.md changes. `--check` fails
 * without writing, which is what CI runs.
 *
 *   node scripts/build-index.mjs
 *   node scripts/build-index.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(root, 'skills');
const outFile = path.join(root, '.well-known', 'agent-skills', 'index.json');

const SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

// Where the raw SKILL.md files are reachable from. Relative URLs in the index
// resolve against the index URL itself, so these are absolute on purpose:
// the index is served from relintio.com but the artifacts live on GitHub.
const RAW_BASE =
  process.env.RELINTIO_SKILLS_RAW_BASE ??
  'https://raw.githubusercontent.com/Relintio/skills/main';

/** Minimal frontmatter reader — the flat fields the discovery schema needs. */
function frontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;

  const data = {};
  let key = null;

  for (const line of match[1].split('\n')) {
    // continuation of a folded multi-line value
    if (key && /^\s+\S/.test(line) && !/^\s*[A-Za-z0-9_-]+:/.test(line)) {
      data[key] += ' ' + line.trim();
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name === 'SKILL.md') yield full;
  }
}

const skills = [];

for (const file of [...walk(skillsDir)].sort()) {
  const raw = fs.readFileSync(file, 'utf8');
  const data = frontmatter(raw);

  if (!data?.name || !data?.description) {
    console.error(`skipping ${path.relative(root, file)} — missing name or description`);
    process.exitCode = 1;
    continue;
  }

  // The schema caps descriptions at 1024 characters and the CLI silently
  // drops anything longer, so fail loudly here instead.
  if (data.description.length > 1024) {
    console.error(
      `${data.name}: description is ${data.description.length} chars, max is 1024`,
    );
    process.exitCode = 1;
    continue;
  }

  const rel = path.relative(root, file).split(path.sep).join('/');
  const digest = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

  skills.push({
    name: data.name,
    description: data.description,
    type: 'skill-md',
    url: `${RAW_BASE}/${rel}`,
    digest: `sha256:${digest}`,
  });
}

if (process.exitCode) {
  console.error('\nIndex not written — fix the errors above.');
  process.exit(1);
}

const index = { $schema: SCHEMA, skills };
const rendered = JSON.stringify(index, null, 2) + '\n';

if (process.argv.includes('--check')) {
  let current = null;
  try {
    current = fs.readFileSync(outFile, 'utf8');
  } catch {
    /* missing */
  }
  const served = path.resolve(root, '..', '..', 'resources', 'content', 'agent-skills-index.json');
  let servedCurrent = null;
  if (fs.existsSync(path.dirname(served))) {
    try {
      servedCurrent = fs.readFileSync(served, 'utf8');
    } catch {
      servedCurrent = null;
    }
  }

  if (current !== rendered || (servedCurrent !== null && servedCurrent !== rendered)) {
    console.error(
      'Discovery index is stale. Run: node scripts/build-index.mjs\n' +
        'A stale digest makes `npx skills add relintio.com` reject the entry.',
    );
    process.exit(1);
  }
  console.log(`✓ discovery index up to date (${skills.length} skills)`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, rendered, 'utf8');
console.log(`✓ wrote ${path.relative(root, outFile)} — ${skills.length} skills`);

// Inside the monorepo, also drop it where the Laravel app serves machine
// documents from, so https://relintio.com/.well-known/agent-skills/index.json
// and the copy in this repository can never disagree.
const served = path.resolve(root, '..', '..', 'resources', 'content', 'agent-skills-index.json');
if (fs.existsSync(path.dirname(served))) {
  fs.writeFileSync(served, rendered, 'utf8');
  console.log(`✓ wrote resources/content/agent-skills-index.json`);
}
