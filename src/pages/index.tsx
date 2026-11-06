import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import FuzzyHero from '@site/src/components/FuzzyHero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import LearnFuzzyLogic from '@site/src/components/LearnFuzzyLogic';

export default function Home(): ReactNode {
  return (
    <Layout
      title="Fuzzy logic library for Python and Rust"
      description="Ferrifuzz is an open-source fuzzy logic library for Python and Rust. Build Mamdani, Sugeno and interval type-2 fuzzy inference systems from plain-text rules.">
      <FuzzyHero />
      <main>
        <HomepageFeatures />
        <LearnFuzzyLogic />
      </main>
    </Layout>
  );
}
