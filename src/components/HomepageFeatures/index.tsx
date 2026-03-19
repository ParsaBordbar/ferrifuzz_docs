import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import IntroSection from '../Introduction';

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
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <IntroSection />
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
