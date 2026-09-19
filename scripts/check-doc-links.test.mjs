import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { findBrokenDocumentLinks } from './check-doc-links.mjs';

const fixtureRoots = [];

function createFixture(markdown, files = []) {
  const root = mkdtempSync(path.join(tmpdir(), 'blog-doc-links-'));
  fixtureRoots.push(root);
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  writeFileSync(path.join(root, 'README.md'), markdown);

  for (const file of files) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, '# Fixture\n');
  }

  return root;
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test('supports balanced parentheses and reference definitions', () => {
  const root = createFixture(
    [
      '[Inline](docs/guide(v2).md)',
      '[Reference][guide]',
      '[Collapsed][]',
      '[guide]: <docs/reference guide.md> "Guide"',
      '[collapsed]: docs/collapsed.md',
    ].join('\n'),
    ['docs/guide(v2).md', 'docs/reference guide.md', 'docs/collapsed.md'],
  );

  assert.deepEqual(findBrokenDocumentLinks(root).broken, []);
});

test('ignores links inside fenced, inline, and indented code', () => {
  const root = createFixture(
    [
      '```md',
      '[Fenced](docs/missing-fenced.md)',
      '[fenced-ref]: docs/missing-reference.md',
      '```',
      '`[Inline](docs/missing-inline.md)`',
      '    [Indented](docs/missing-indented.md)',
    ].join('\n'),
  );

  assert.deepEqual(findBrokenDocumentLinks(root).broken, []);
});

test('reports missing inline and reference-definition targets', () => {
  const root = createFixture(
    ['[Missing](docs/missing(v2).md)', '[missing-ref]: docs/missing-reference.md'].join(
      '\n',
    ),
  );

  const targets = findBrokenDocumentLinks(root).broken.map((issue) => issue.target);
  assert.deepEqual(targets, ['docs/missing(v2).md', 'docs/missing-reference.md']);
});

test('reports missing full and collapsed reference definitions', () => {
  const root = createFixture(['[Full][missing]', '[Collapsed][]'].join('\n'));

  const { broken } = findBrokenDocumentLinks(root);
  assert.deepEqual(
    broken.map((issue) => issue.target),
    ['[missing]', '[Collapsed]'],
  );
  assert.ok(
    broken.every((issue) => issue.reason === 'reference definition does not exist'),
  );
});

test('reports malformed URI encoding without throwing', () => {
  const root = createFixture('[Bad](docs/%E0%A4%A.md)');
  const { broken } = findBrokenDocumentLinks(root);

  assert.equal(broken.length, 1);
  assert.equal(broken[0].reason, 'invalid URI encoding');
});

test('checks file:/// absolute targets against the filesystem', () => {
  const root = createFixture('', ['docs/present.md']);
  const present = path.join(root, 'docs', 'present.md').replace(/\\/g, '/');
  writeFileSync(
    path.join(root, 'README.md'),
    [
      `[Ok](file:///${present})`,
      '[Missing](file:///D:/definitely/not/here-9f2c.md)',
    ].join('\n'),
  );

  const targets = findBrokenDocumentLinks(root).broken.map((issue) => issue.target);
  assert.deepEqual(targets, ['file:///D:/definitely/not/here-9f2c.md']);
});

test('downgrades dead links inside dated snapshots to historical', () => {
  const root = createFixture('[Live](docs/missing-live.md)');
  writeFileSync(
    path.join(root, 'docs', 'report-2026-07-22.md'),
    '[Snapshot](docs/missing-snapshot.md)\n',
  );

  const { broken, historical } = findBrokenDocumentLinks(root);
  assert.deepEqual(
    broken.map((issue) => issue.target),
    ['docs/missing-live.md'],
  );
  assert.deepEqual(
    historical.map((issue) => issue.target),
    ['docs/missing-snapshot.md'],
  );
});
