import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appleMusicEmbedUrl } from '../src/lib/music.ts';

const album = 'https://music.apple.com/gb/album/in-rainbows/1109714933';

test('derive the official embed URL for each demo album', () => {
  for (const path of ['/gb/album/in-rainbows/1109714933', '/gb/album/kind-of-blue/268443092', '/gb/album/moon-safari/697240234']) {
    assert.equal(appleMusicEmbedUrl(`https://music.apple.com${path}`), `https://embed.music.apple.com${path}`);
  }
});

test('drop attribution, fragments, and autoplay parameters', () => {
  assert.equal(appleMusicEmbedUrl(`${album}?app=music&autoplay=true#track`), 'https://embed.music.apple.com/gb/album/in-rainbows/1109714933');
});

test('support other storefronts, ID-only links, and trailing slashes', () => {
  for (const path of ['/us/album/kind-of-blue/268443092', '/gb/album/1109714933', '/gb/album/in-rainbows/1109714933/']) {
    assert.equal(appleMusicEmbedUrl(`https://music.apple.com${path}`), `https://embed.music.apple.com${path}`);
  }
});

test('reject non-Apple hosts, credentials, ports, and insecure protocols', () => {
  for (const url of ['https://example.com/gb/album/title/123', 'https://music.apple.com.evil.test/gb/album/title/123', 'https://user:password@music.apple.com/gb/album/title/123', 'https://music.apple.com:444/gb/album/title/123', 'http://music.apple.com/gb/album/title/123', 'not a URL']) {
    assert.throws(() => appleMusicEmbedUrl(url));
  }
});

test('reject playlist, song, private library, and malformed album links', () => {
  for (const path of ['/gb/playlist/title/123', '/gb/song/title/123', '/library/albums/123', '/gb/album/title/not-an-id', '/gb/album/title/123/extra', '/gb/album/']) {
    assert.throws(() => appleMusicEmbedUrl(`https://music.apple.com${path}`));
  }
});
