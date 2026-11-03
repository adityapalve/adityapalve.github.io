/** Only public HTTPS album links may become Apple-hosted player URLs. */
export function appleMusicEmbedUrl(albumUrl: string): string {
  const url = new URL(albumUrl);

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'music.apple.com' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    !/^\/[a-z]{2}\/album\/(?:[^/]+\/)?\d+\/?$/.test(url.pathname)
  ) {
    throw new Error('Expected a public HTTPS Apple Music album URL.');
  }

  // Drop attribution, fragment, and playback parameters; selection never requests autoplay.
  return `https://embed.music.apple.com${url.pathname}`;
}
