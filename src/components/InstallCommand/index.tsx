import React, {useState} from 'react';
import styles from './styles.module.css';

export default function InstallCommand() {
  // Pre-release builds are published to TestPyPI; switch to `pip install ferrifuzz`
  // once the package is on PyPI.
  const command = 'pip install -i https://test.pypi.org/simple/ "ferrifuzz==0.2.0"';
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
