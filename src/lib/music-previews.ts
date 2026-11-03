import { z } from 'zod';

const lookupResponse = z.object({
  results: z.array(z.object({
    wrapperType: z.string(),
    trackName: z.string().optional(),
    previewUrl: z.string().url().optional(),
  })),
});

export interface TrackPreview {
  title: string;
  url: string;
}

/** Validate the external response and ignore tracks without Apple-hosted previews. */
export function parseApplePreviews(json: string): TrackPreview[] {
  const response = lookupResponse.parse(JSON.parse(json));

  const tracks: TrackPreview[] = [];

  for (const item of response.results) {
    if (item.wrapperType !== 'track' || !item.trackName || !item.previewUrl) continue;

    const url = new URL(item.previewUrl);

    if (url.protocol !== 'https:' || !url.hostname.endsWith('.itunes.apple.com')) continue;

    tracks.push({ title: item.trackName, url: url.href });
  }

  return tracks;
}
