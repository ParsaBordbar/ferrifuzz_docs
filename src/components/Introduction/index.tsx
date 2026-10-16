import React from 'react';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';
import InstallCommand from '../InstallCommand';

export default function IntroSection() {
  return (
    <section className={styles.introSection}>
      <div className={styles.container}>
        

        <div className={styles.text}>
          <div className={styles.titlesec}>
            <div className={styles.logoWrapper}>
                <img
                    src={useBaseUrl('/img/favicon.svg')}
                    alt="Ferrifuzz logo"
                    className={styles.logo}
                />
            </div>
            <h2 className={styles.title}>Ferrifuzz</h2>
          </div>
          <p>
            Ferrifuzz is a fuzzy logic library with a pure‑Rust core and a
            Python package on top. Build Mamdani, Sugeno/TSK and interval
            type‑2 systems from plain‑text rules, forecast with fuzzy time
            series, and get clear error messages when something is off.
          </p>
            <InstallCommand />
        </div>
      </div>
    </section>
  );
}
