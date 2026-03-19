import React, {useState} from 'react';
import styles from './styles.module.css';

export default function InstallCommand() {
  const command = 'pip install ferrifuzz';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.wrapper}>
      <code className={styles.command}>{command}</code>
      <button onClick={copy} className={styles.button}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
