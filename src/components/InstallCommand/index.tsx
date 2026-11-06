import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const COMMAND = 'pip install ferrifuzz';
type Status = 'idle' | 'copied' | 'manual';

export default function InstallCommand(): ReactNode {
  const [status, setStatus] = useState<Status>('idle');
  const commandRef = useRef<HTMLElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let next: Status = 'copied';
    try {
      await navigator.clipboard.writeText(COMMAND);
    } catch {
      // The clipboard API is missing on plain http and can be refused elsewhere.
      if (commandRef.current) {
        window.getSelection()?.selectAllChildren(commandRef.current);
      }
      next = 'manual';
    }
    setStatus(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div className={styles.wrapper}>
      <code ref={commandRef} className={styles.command}>
        {COMMAND}
      </code>
      <button type="button" onClick={copy} className={styles.button}>
        <span
          className={clsx(
            styles.icon,
            status === 'copied' ? styles.iconCheck : styles.iconCopy,
          )}
          aria-hidden="true"
        />
        <span aria-live="polite">
          {status === 'idle' && 'Copy'}
          {status === 'copied' && 'Copied'}
          {status === 'manual' && 'Selected, press Ctrl+C'}
        </span>
      </button>
    </div>
  );
}
