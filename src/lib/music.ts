/** Only public album links may become Apple-hosted player URLs. */
export function appleMusicEmbedUrl(albumUrl: string): string {
  const url = new URL(albumUrl);

  if (url.hostname !== 'music.apple.com' || !/^\/[a-z]{2}\/album\//.test(url.pathname)) {
    throw new Error('Expected a public Apple Music album URL.');
  }

  return `https://embed.music.apple.com${url.pathname}`;
}

/** The public iTunes lookup supplies promotional track previews, not subscriber streams. */
export function appleMusicLookupUrl(albumUrl: string): string {
  // Apply the same host validation as the standalone embed.
  const url = new URL(appleMusicEmbedUrl(albumUrl));

  const album = url.pathname.match(/^\/([a-z]{2})\/album\/(?:[^/]+\/)?(\d+)\/?$/);

  if (!album) throw new Error('Expected an Apple Music album ID and storefront.');

  return `https://itunes.apple.com/lookup?id=${album[2]}&entity=song&country=${album[1]}`;
}
