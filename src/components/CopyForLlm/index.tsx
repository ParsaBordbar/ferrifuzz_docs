import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type Status = 'idle' | 'copied' | 'failed';

async function loadMarkdown(url: string): Promise<string> {
  const response = await fetch(url);
  // `npm start` answers unknown paths with the app's HTML, not a 404.
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`No Markdown at ${url}`);
  }
  return response.text();
}

async function copyMarkdown(url: string): Promise<void> {
  // Safari only allows clipboard writes that start inside the click, so hand it the pending
  // text rather than waiting for the fetch first.
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const blob = loadMarkdown(url).then((text) => new Blob([text], {type: 'text/plain'}));
    await navigator.clipboard.write([new ClipboardItem({'text/plain': blob})]);
    return;
  }
  await navigator.clipboard.writeText(await loadMarkdown(url));
}

export default function CopyForLlm({url}: {url: string}): ReactNode {
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    try {
      await copyMarkdown(url);
      setStatus('copied');
      timer.current = window.setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('failed');
    }
  };

  // Without clipboard access (plain http, or permission refused), offer the text itself.
  if (status === 'failed') {
    return (
      <a className={styles.button} href={url} target="_blank" rel="noopener">
        Copy failed. Open Markdown
      </a>
    );
  }

  return (
    <button
      type="button"
      className={styles.button}
      onClick={copy}
      title="Copy this page as Markdown to paste into ChatGPT, Claude or another LLM">
      <span
        className={clsx(
          styles.icon,
          status === 'copied' ? styles.iconCheck : styles.iconCopy,
        )}
        aria-hidden="true"
      />
      <span aria-live="polite">{status === 'copied' ? 'Copied' : 'Copy for LLM'}</span>
    </button>
  );
}
