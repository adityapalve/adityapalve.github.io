import { parseApplePreviews } from '../lib/music-previews';
import type { TrackPreview } from '../lib/music-previews';

export function setupRecords(): void {
  const collection = document.querySelector<HTMLElement>('[data-records]');

  const dialog = document.querySelector<HTMLDialogElement>('#record-dialog');

  const player = document.querySelector<HTMLAudioElement>('#record-player');

  const title = document.querySelector<HTMLElement>('#record-dialog-title');

  const artist = document.querySelector<HTMLElement>('[data-player-artist]');

  const link = document.querySelector<HTMLAnchorElement>('[data-player-link]');

  const close = document.querySelector<HTMLButtonElement>('.close-player');

  const minimize = document.querySelector<HTMLButtonElement>('.minimize-player');

  const trackSelect = document.querySelector<HTMLSelectElement>('#record-track');

  const status = document.querySelector<HTMLElement>('[data-player-status]');

  if (!collection || !dialog || !player || !title || !artist || !link || !close || !minimize || !trackSelect || !status) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeRecord: HTMLAnchorElement | null = null;

  let playing = false;

  let pending: AbortController | null = null;

  let tracks: TrackPreview[] = [];

  const syncRotation = () => {
    for (const record of collection.querySelectorAll<HTMLAnchorElement>('.vinyl')) {
      record.toggleAttribute('data-playing', record === activeRecord && playing && !preference.matches && !document.hidden);
    }
  };

  const setPlayback = (isPlaying: boolean, message: string) => {
    playing = isPlaying;
    status.textContent = message;
    syncRotation();
  };

  const resetAudio = () => {
    player.pause();
    player.removeAttribute('src');
    player.load();
    setPlayback(false, '');
  };

  const selectTrack = () => {
    const track = tracks[trackSelect.selectedIndex];

    if (!track) return;

    resetAudio();
    player.src = track.url;
    player.setAttribute('aria-label', `${track.title} — track preview`);
    status.textContent = 'Press play to hear this preview.';
  };

  // Rotation follows actual media events, not selection, focus, or a guessed iframe state.
  player.addEventListener('playing', () => setPlayback(true, 'Playing preview.'));
  player.addEventListener('pause', () => setPlayback(false, 'Paused.'));
  player.addEventListener('waiting', () => setPlayback(false, 'Buffering preview…'));
  player.addEventListener('seeking', () => setPlayback(false, 'Seeking…'));
  player.addEventListener('ended', () => setPlayback(false, 'Preview finished. Choose another track to keep listening.'));
  player.addEventListener('emptied', () => setPlayback(false, ''));
  player.addEventListener('error', () => setPlayback(false, 'Preview unavailable. Try another track or open Apple Music.'));
  trackSelect.addEventListener('change', selectTrack);
  preference.addEventListener('change', syncRotation);
  document.addEventListener('visibilitychange', syncRotation);

  const loadPreviews = async (lookupUrl: string) => {
    pending?.abort();

    const request = new AbortController();

    pending = request;

    const timeout = window.setTimeout(() => request.abort(), 12000);

    trackSelect.disabled = true;
    trackSelect.replaceChildren(new Option('Loading previews…', ''));
    status.textContent = 'Loading track previews from Apple…';

    try {
      const response = await fetch(lookupUrl, { signal: request.signal, credentials: 'omit' });

      if (!response.ok) throw new Error('Apple lookup failed.');

      const previews = parseApplePreviews(await response.text());

      // An older selection/closed dock must never replace the current record's tracks.
      if (pending !== request) return;

      if (previews.length === 0) throw new Error('No previews available.');

      tracks = previews;
      trackSelect.replaceChildren(...tracks.map((track, index) => new Option(track.title, String(index))));
      trackSelect.disabled = false;
      selectTrack();
    } catch {
      if (pending !== request) return;

      trackSelect.replaceChildren(new Option('Previews unavailable', ''));
      setPlayback(false, 'Previews unavailable here. You can still open the album in Apple Music.');
    } finally {
      window.clearTimeout(timeout);

      if (pending === request) pending = null;
    }
  };

  // Links still work without JS or on modified/new-tab clicks. No Apple request on page load.
  for (const record of collection.querySelectorAll<HTMLAnchorElement>('.vinyl')) {
    record.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      if (!record.dataset.lookup || !record.dataset.title || !record.dataset.artist) return;

      event.preventDefault();
      delete dialog.dataset.minimized;
      minimize.setAttribute('aria-expanded', 'true');
      minimize.setAttribute('aria-label', 'Minimize record player');
      minimize.textContent = '−';

      if (!dialog.open) dialog.show();

      // Reopening the playing record must not restart or interrupt its audio.
      if (activeRecord === record) return;

      resetAudio();
      activeRecord = record;
      tracks = [];
      title.textContent = record.dataset.title;
      artist.textContent = record.dataset.artist;
      link.href = record.href;
      void loadPreviews(record.dataset.lookup);
    });
  }

  close.addEventListener('click', () => dialog.close());
  link.addEventListener('click', () => player.pause());

  minimize.addEventListener('click', () => {
    const minimized = dialog.toggleAttribute('data-minimized');

    minimize.setAttribute('aria-expanded', String(!minimized));
    minimize.setAttribute('aria-label', minimized ? 'Expand record player' : 'Minimize record player');
    minimize.textContent = minimized ? '+' : '−';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !dialog.open) return;

    event.preventDefault();
    event.stopPropagation();
    dialog.close();
  }, { capture: true });

  dialog.addEventListener('close', () => {
    pending?.abort();
    pending = null;
    resetAudio();
    activeRecord = null;
    tracks = [];
    syncRotation();
  });
}
