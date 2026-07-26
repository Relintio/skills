#!/usr/bin/env node
/**
 * Validate every SKILL.md the way the `skills` CLI does, plus the extra rules
 * we hold ourselves to.
 *
 * The CLI silently skips a malformed skill. That means a typo in frontmatter
 * ships as "the skill vanished" rather than as an error, and nobody notices
 * until an agent fails to find it. This turns that into a failed build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(root, 'skills');
const CATEGORIES = ['core', 'runtimes', 'operations'];

const problems = [];
const skills = new Map();

const fail = (file, message) =>
  problems.push(`${path.relative(root, file).split(path.sep).join('/')}: ${message}`);

function frontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const data = {};
  let key = null;

  for (const line of match[1].split('\n')) {
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
  return { data, body: match[2] };
}

function* walkFiles(dir, exts = /\.(md|json|ya?ml)$/) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full, exts);
    else if (exts.test(entry.name)) yield full;
  }
}

// ---- skills ---------------------------------------------------------------

for (const category of CATEGORIES) {
  const dir = path.join(skillsDir, category);
  if (!fs.existsSync(dir)) {
    problems.push(`skills/${category}: category directory is missing`);
    continue;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(dir, entry.name);
    const file = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(file)) {
      fail(skillDir, 'has no SKILL.md');
      continue;
    }

    const raw = fs.readFileSync(file, 'utf8');
    const parsed = frontmatter(raw);

    if (!parsed) {
      fail(file, 'has no YAML frontmatter block');
      continue;
    }

    const { data, body } = parsed;

    for (const field of ['name', 'description', 'license']) {
      if (!data[field]) fail(file, `missing required frontmatter field "${field}"`);
    }

    if (data.name && data.name !== entry.name) {
      fail(file, `frontmatter name "${data.name}" does not match directory "${entry.name}"`);
    }

    // The discovery schema is stricter than the CLI: lowercase, digits, single
    // hyphens only. A name that violates this installs fine from GitHub and
    // then silently disappears from the .well-known index.
    if (data.name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) {
      fail(file, `name "${data.name}" is not a valid discovery-schema slug`);
    }

    if (data.name) {
      if (skills.has(data.name)) fail(file, `duplicate skill name "${data.name}"`);
      else skills.set(data.name, { file, category, dir: skillDir });
    }

    if (data.description) {
      if (data.description.length < 60) {
        fail(file, 'description is too short to route on — say when to use the skill');
      }
      if (data.description.length > 1024) {
        fail(file, `description is ${data.description.length} chars; the discovery schema caps it at 1024`);
      }
    }

    if (!body.trim()) fail(file, 'has frontmatter but no body');

    for (const [, target] of body.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)) {
      const resolved = path.resolve(skillDir, target.split('#')[0]);
      if (!fs.existsSync(resolved)) fail(file, `broken relative link: ${target}`);
    }
  }
}

if (skills.size === 0) problems.push('no skills found');
if (!skills.has('relintio')) problems.push('the router skill `relintio` is missing');

// ---- cross-skill references ------------------------------------------------

for (const [name, { file }] of skills) {
  const body = fs.readFileSync(file, 'utf8');
  for (const [, referenced] of body.matchAll(/`(relintio(?:-[a-z0-9-]+)?)`/g)) {
    // A backticked relintio-* token that is not a known skill is usually a
    // renamed skill nobody updated. Package names are the false positives.
    if (skills.has(referenced) || referenced === name) continue;
    if (referenced === 'relintio-agent' || referenced === 'relintio-golang-agent') continue;
    fail(file, `references unknown skill \`${referenced}\``);
  }
}

// ---- manifest drift --------------------------------------------------------

const manifestPath = path.join(root, '.claude-plugin', 'marketplace.json');
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const listed = new Set();

  for (const plugin of manifest.plugins ?? []) {
    for (const entry of plugin.skills ?? []) {
      listed.add(entry.replace(/^\.\//, ''));
      const resolved = path.join(root, entry);
      if (!fs.existsSync(path.join(resolved, 'SKILL.md'))) {
        fail(manifestPath, `lists "${entry}", which has no SKILL.md`);
      }
    }
  }

  for (const [name, { category }] of skills) {
    const expected = `skills/${category}/${name}`;
    if (!listed.has(expected)) {
      fail(manifestPath, `does not list "${expected}" — agents installing the plugin will not get it`);
    }
  }
} catch (error) {
  fail(manifestPath, `could not be read: ${error.message}`);
}

// ---- no committed credentials ---------------------------------------------

for (const file of walkFiles(root)) {
  if (file.includes(`${path.sep}node_modules${path.sep}`)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const [match] of text.matchAll(/UP_(?:LIVE|TEST)_[A-Za-z0-9._-]{8,}/g)) {
    if (/REDACTED|xxx|ci0000000000/i.test(match)) continue;
    fail(file, `looks like a real license key: ${match.slice(0, 12)}…`);
  }
}

// ---- report ----------------------------------------------------------------

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error('');
  process.exit(1);
}

const byCategory = CATEGORIES.map(
  (c) => `${[...skills.values()].filter((s) => s.category === c).length} ${c}`,
).join(', ');

console.log(`✓ ${skills.size} skills valid (${byCategory})`);
