import type {ReactNode} from 'react';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Pythonic Fuzzy Logic',
    Svg: require('@site/static/img/py.svg').default,
    description: (
      <>
        Clear, expressive fuzzy systems with a clean Python API — no boilerplate, no surprises.
      </>
    ),
  },
  {
    title: 'Rust‑Powered Performance',
    Svg: require('@site/static/img/rustPowered.svg').default,
    description: (
      <>
        High‑performance inference and rule evaluation implemented in Rust, safely exposed to Python.
      </>
    ),
  },
  {
    title: 'Built for Uncertainty',
    Svg: require('@site/static/img/uncertainty.svg').default,
    description: (
      <>
        Designed around partial truth, overlapping membership functions, and real‑world ambiguity.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={styles.feature}>
      <Svg className={styles.featureSvg} aria-hidden="true" />
      <div>
        <Heading as="h2" className={styles.featureTitle}>
          {title}
        </Heading>
        <p className={styles.featureText}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className={styles.grid}>
        {FeatureList.map((props) => (
          <Feature key={props.title} {...props} />
        ))}
      </div>
    </section>
  );
}
