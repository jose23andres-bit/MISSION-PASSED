import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

export const root = resolve(import.meta.dirname, '..', '..');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', 'test-results']);

// Files tracked by git; falls back to a directory walk outside a git checkout.
export function repoFiles(base = root) {
  try {
    const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\0').filter(Boolean).map((file) => resolve(base, file));
  } catch {
    return walk(base);
  }
}

export function walk(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) result.push(...walk(path));
    else result.push(path);
  }
  return result;
}

export const rel = (file) => relative(root, file).split(sep).join('/');

const inActions = process.env.GITHUB_ACTIONS === 'true';
const esc = (text) => String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

// Collects findings and prints them as GitHub annotations plus a markdown job summary.
export class Report {
  constructor(title) {
    this.title = title;
    this.errors = [];
    this.warnings = [];
    this.notes = [];
  }

  error(file, line, message) {
    this.errors.push({ file, line, message });
    if (inActions) console.log(`::error file=${file}${line ? `,line=${line}` : ''},title=${esc(this.title)}::${esc(message)}`);
    else console.error(`ERROR ${file}${line ? `:${line}` : ''} ${message}`);
  }

  warn(file, line, message) {
    this.warnings.push({ file, line, message });
    if (inActions) console.log(`::warning file=${file}${line ? `,line=${line}` : ''},title=${esc(this.title)}::${esc(message)}`);
    else console.warn(`WARN  ${file}${line ? `:${line}` : ''} ${message}`);
  }

  note(message) {
    this.notes.push(message);
    console.log(message);
  }

  // Appends a markdown section to the GitHub job summary and sets the exit code.
  finish(okMessage) {
    const lines = [`### ${this.title}`, ''];
    if (this.errors.length === 0) lines.push(`✅ ${okMessage}`);
    else {
      lines.push(`❌ **${this.errors.length} problema(s) bloqueante(s)**`, '', '| Archivo | Línea | Problema |', '|---|---|---|');
      for (const item of this.errors) lines.push(`| \`${item.file}\` | ${item.line ?? ''} | ${String(item.message).replace(/\|/g, '\\|')} |`);
    }
    if (this.warnings.length) {
      lines.push('', `⚠️ ${this.warnings.length} aviso(s) no bloqueante(s)`);
      for (const item of this.warnings.slice(0, 25)) lines.push(`- \`${item.file}${item.line ? `:${item.line}` : ''}\` ${item.message}`);
    }
    for (const note of this.notes) lines.push('', note);
    summary(lines.join('\n'));
    if (this.errors.length) {
      console.error(`\n${this.title}: ${this.errors.length} problema(s) bloqueante(s).`);
      process.exitCode = 1;
    } else {
      console.log(`\n${this.title}: ${okMessage}`);
    }
  }
}

export function summary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n\n`);
}

export function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}
