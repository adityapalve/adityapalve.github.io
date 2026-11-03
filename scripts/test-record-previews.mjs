import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appleMusicEmbedUrl, appleMusicLookupUrl } from '../src/lib/music.ts';
import { parseApplePreviews } from '../src/lib/music-previews.ts';

const album = 'https://music.apple.com/gb/album/in-rainbows/1109714933';

const preview = 'https://audio-ssl.itunes.apple.com/itunes-assets/preview.m4a';

test('derive Apple URLs from the public album link, not attribution parameters', () => {
  assert.equal(appleMusicEmbedUrl(`${album}?app=music#track`), 'https://embed.music.apple.com/gb/album/in-rainbows/1109714933');
  assert.equal(appleMusicLookupUrl(`${album}?app=music`), 'https://itunes.apple.com/lookup?id=1109714933&entity=song&country=gb');
  assert.equal(appleMusicLookupUrl('https://music.apple.com/us/album/kind-of-blue/268443092'), 'https://itunes.apple.com/lookup?id=268443092&entity=song&country=us');
});

test('reject non-Apple hosts and non-album URLs', () => {
  for (const url of ['https://example.com/gb/album/title/123', 'https://music.apple.com.evil.test/gb/album/title/123', 'https://music.apple.com/gb/playlist/title/123', 'https://music.apple.com/gb/album/title/not-an-id']) {
    assert.throws(() => appleMusicLookupUrl(url));
  }
});

test('skip collection metadata and tracks without previews, preserving track order', () => {
  const json = JSON.stringify({ results: [
    { wrapperType: 'collection' },
    { wrapperType: 'track', trackName: '15 Step', previewUrl: preview },
    { wrapperType: 'track', trackName: 'Unavailable' },
    { wrapperType: 'track', trackName: 'Bodysnatchers', previewUrl: `${preview}?track=2` },
  ] });

  assert.deepEqual(parseApplePreviews(json), [
    { title: '15 Step', url: preview },
    { title: 'Bodysnatchers', url: `${preview}?track=2` },
  ]);
});

test('ignore insecure, third-party, and lookalike preview hosts', () => {
  const urls = ['http://audio-ssl.itunes.apple.com/preview.m4a', 'https://example.com/preview.m4a', 'https://audio-ssl.itunes.apple.com.evil.test/preview.m4a'];

  const json = JSON.stringify({ results: urls.map(url => ({ wrapperType: 'track', trackName: 'Track', previewUrl: url })) });

  assert.deepEqual(parseApplePreviews(json), []);
});

test('empty results are a supported no-preview state', () => {
  assert.deepEqual(parseApplePreviews('{"results":[]}'), []);
});

test('malformed or unexpected lookup responses fail validation', () => {
  for (const json of ['not json', '{}', '{"results":{}}', '{"results":[{"wrapperType":"track","trackName":42}]}']) {
    assert.throws(() => parseApplePreviews(json));
  }
});
