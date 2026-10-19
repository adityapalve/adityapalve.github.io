/**
 * The footer pickers.
 *
 * Each `<select>` in the nav is self-describing: its `id` is both the `data-` attribute it sets
 * on `<html>` and its storage key, and its values are its own options. So adding a picker is
 * markup only — see the `preferences` list in `BaseLayout.astro`.
 */

function stored(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function remember(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable; the choice still holds for this visit
  }
}

function offers(select: HTMLSelectElement, value: string): boolean {
  return Array.from(select.options).some((option) => option.value === value);
}

/**
 * Pin the browser chrome to the theme's background.
 *
 * The two `theme-color` metas in the head are media-scoped, which is all `auto` needs. Any real
 * choice gets one media-less meta appended after them, which is the one browsers read last.
 */
function paintChrome(theme: string): void {
  document.querySelector('meta[name="theme-color"]:not([media])')?.remove();

  if (theme === 'auto') return;

  const meta = document.createElement('meta');

  meta.name = 'theme-color';
  meta.content = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
  document.head.append(meta);
}

function apply(key: string, value: string): void {
  document.documentElement.dataset[key] = value;

  // Only the theme reaches past the page and into the browser's own chrome
  if (key === 'theme') paintChrome(value);
}

/**
 * Reflect the stored choices in the controls and keep the two in step. The inline script in the
 * head has already put the remembered values on the element, so the controls only follow.
 */
export function loadPreferences(): void {
  for (const select of document.querySelectorAll<HTMLSelectElement>('nav select')) {
    const key = select.id;

    if (key === '') continue;

    const remembered = stored(key, select.value);

    // A choice from an older build may no longer be on the menu
    if (offers(select, remembered)) select.value = remembered;

    apply(key, select.value);

    select.addEventListener('change', () => {
      remember(key, select.value);
      apply(key, select.value);
    });
  }
}
