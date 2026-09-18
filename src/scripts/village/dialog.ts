/** Pokémon-style text box rendered in HTML so it stays crisp and readable by assistive tech. */
export type Page = { text: string; links?: { label: string; url: string }[] };

export type TextBox = {
  element: HTMLElement;
  open: (speaker: string, pages: Page[], onClose: () => void) => void;
  advance: () => void;
  close: () => void;
  isOpen: () => boolean;
};

export function createTextBox(root: HTMLElement): TextBox {
  const box = document.createElement('div');
  const speakerElement = document.createElement('div');
  const textElement = document.createElement('p');
  const linksElement = document.createElement('p');
  const cue = document.createElement('span');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  box.className = 'textbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-live', 'polite');
  box.hidden = true;
  speakerElement.className = 'textbox-speaker';
  textElement.className = 'textbox-text';
  linksElement.className = 'textbox-links';
  cue.className = 'textbox-cue';
  cue.setAttribute('aria-hidden', 'true');
  cue.textContent = '▼';
  box.append(speakerElement, textElement, linksElement, cue);
  root.append(box);

  let pages: Page[] = [];
  let index = 0;
  let typing: number | undefined;
  let done = () => {};

  const finishTyping = () => {
    if (typing !== undefined) window.clearInterval(typing);

    typing = undefined;
    textElement.textContent = pages[index]?.text ?? '';
    cue.hidden = false;
  };

  const showPage = () => {
    const page = pages[index];

    if (page === undefined) return;

    linksElement.replaceChildren();

    for (const link of page.links ?? []) {
      const anchor = document.createElement('a');

      // Other sites open in a new tab; pages on this site replace the village
      const external = /^https?:/.test(link.url);

      anchor.href = link.url;
      anchor.textContent = `${link.label} ${external ? '↗' : '→'}`;

      if (external) {
        anchor.target = '_blank';
        anchor.rel = 'noopener';
      }

      linksElement.append(anchor);
    }

    cue.hidden = true;

    if (reduced) {
      finishTyping();

      return;
    }

    let shown = 0;

    textElement.textContent = '';
    typing = window.setInterval(() => {
      shown += 1;
      textElement.textContent = page.text.slice(0, shown);

      if (shown >= page.text.length) finishTyping();
    }, 18);
  };

  const close = () => {
    if (typing !== undefined) window.clearInterval(typing);

    typing = undefined;
    box.hidden = true;
    pages = [];
    done();
  };

  return {
    element: box,
    open: (speaker, nextPages, onClose) => {
      pages = nextPages;
      index = 0;
      done = onClose;
      speakerElement.textContent = speaker;
      box.hidden = false;
      showPage();
    },
    advance: () => {
      if (box.hidden) return;

      if (typing !== undefined) {
        finishTyping();

        return;
      }

      if (index + 1 >= pages.length) {
        close();

        return;
      }

      index += 1;
      showPage();
    },
    close,
    isOpen: () => !box.hidden,
  };
}
