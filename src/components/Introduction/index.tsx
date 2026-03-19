import React from 'react';
import styles from './styles.module.css';
import InstallCommand from '../InstallCommand';

export default function IntroSection() {
  return (
    <section className={styles.introSection}>
      <div className={styles.container}>
        

        <div className={styles.text}>
          <div className={styles.titlesec}>
            <div className={styles.logoWrapper}>
                <img
                    src="/img/favicon.svg"
                    alt="Ferrifuzz logo"
                    className={styles.logo}
                />
            </div>
            <h2 className={styles.title}>Ferrifuzz</h2>
          </div>
          <p>
            Ferrifuzz is a high‑performance fuzzy logic library designed for
            modern systems. It combines a Python‑friendly API with a
            Rust‑powered core to deliver expressive fuzzy models and fast,
            reliable inference — even at scale.
          </p>
            <InstallCommand />
        </div>
      </div>
    </section>
  );
}
