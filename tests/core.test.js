import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/core.js';
const { normalizeUsername, exactUsername } = globalThis.InstCore;
test('accepts usernames, @names and real Instagram profile URLs', () => {
  for (const value of ['Some.One', ' @Some.One ', 'https://www.instagram.com/Some.One/?hl=en', 'https://instagram.com/Some.One']) assert.equal(normalizeUsername(value), 'some.one');
  assert.equal(normalizeUsername(' '), '');
});
test('rejects deceptive hosts, posts and malformed usernames', () => {
  for (const value of ['https://evilinstagram.com/user', 'https://instagram.com.evil.test/user', 'https://instagram.com/p/123/', 'a b', '@@user', '<script>', 'a'.repeat(31)]) assert.throws(() => normalizeUsername(value));
});
test('recipient matching requires the username on the first nonempty line', () => {
  assert.equal(exactUsername({ innerText: 'Some.One\nDisplay Name' }, 'some.one'), true);
  assert.equal(exactUsername({ innerText: 'some.one.fake\nsome.one' }, 'some.one'), false);
  assert.equal(exactUsername({ innerText: '\n  @Some.One \nDisplay Name' }, 'some.one'), true);
  assert.equal(exactUsername({ innerText: '' }, 'some.one'), false);
});
