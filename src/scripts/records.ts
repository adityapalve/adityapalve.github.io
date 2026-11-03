export function setupRecords(): void {
  const collection = document.querySelector<HTMLElement>('[data-records]');

  const dialog = document.querySelector<HTMLDialogElement>('#record-dialog');

  const player = document.querySelector<HTMLIFrameElement>('#record-player');

  const title = document.querySelector<HTMLElement>('#record-dialog-title');

  const artist = document.querySelector<HTMLElement>('[data-player-artist]');

  const link = document.querySelector<HTMLAnchorElement>('[data-player-link]');

  const close = document.querySelector<HTMLButtonElement>('.close-player');

  const minimize = document.querySelector<HTMLButtonElement>('.minimize-player');

  if (!collection || !dialog || !player || !title || !artist || !link || !close || !minimize) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeRecord: HTMLAnchorElement | null = null;

  const syncRotation = () => {
    for (const record of collection.querySelectorAll<HTMLAnchorElement>('.vinyl')) {
      // Apple's cross-origin embed has no playback-state API. This marks the record
      // on the turntable, not a claim that audio is playing or synchronized with pause.
      record.toggleAttribute('data-on-turntable', record === activeRecord && dialog.open && !preference.matches && !document.hidden);
    }
  };

  preference.addEventListener('change', syncRotation);
  document.addEventListener('visibilitychange', syncRotation);

  // Ordinary links still work without JS and on modified/new-tab clicks.
  // Merely visiting the shelf never contacts Apple or starts playback.
  for (const record of collection.querySelectorAll<HTMLAnchorElement>('.vinyl')) {
    record.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      if (!record.dataset.embed || !record.dataset.title || !record.dataset.artist) return;

      event.preventDefault();
      delete dialog.dataset.minimized;
      minimize.setAttribute('aria-expanded', 'true');
      minimize.setAttribute('aria-label', 'Minimize record player');
      minimize.textContent = '−';

      if (!dialog.open) dialog.show();

      // Reopening a minimized record must not reload its iframe or interrupt playback.
      if (activeRecord === record) return;

      activeRecord = record;
      title.textContent = record.dataset.title;
      artist.textContent = record.dataset.artist;
      link.href = record.href;
      player.title = `${record.dataset.title} by ${record.dataset.artist} on Apple Music`;
      player.src = record.dataset.embed;
      syncRotation();
    });
  }

  close.addEventListener('click', () => dialog.close());
  // Hand off to the app/site without leaving a second copy playing in the dock.
  link.addEventListener('click', () => dialog.close());

  minimize.addEventListener('click', () => {
    const minimized = dialog.toggleAttribute('data-minimized');

    // Keep the same mounted iframe and src: no close/recreate cycle when tucked away.
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
    // A queued close event must not tear down a player that has already reopened.
    if (dialog.open) return;

    player.removeAttribute('src');
    activeRecord = null;
    syncRotation();
  });
}
