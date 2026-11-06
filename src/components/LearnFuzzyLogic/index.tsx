import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const GUIDES = [
  {
    to: '/docs/concepts/what-is-fuzzy',
    title: 'What is fuzzy logic?',
    text: 'Partial truth, fuzzy sets and how they differ from crisp sets.',
  },
  {
    to: '/docs/concepts/membership-functions',
    title: 'Membership functions',
    text: 'Triangles, trapezoids, gaussians and when to use each shape.',
  },
  {
    to: '/docs/concepts/inference',
    title: 'Mamdani vs Sugeno inference',
    text: 'How a fuzzy inference system turns rules into an answer.',
  },
  {
    to: '/docs/concepts/interval-type-2',
    title: 'Interval type-2 fuzzy sets',
    text: 'Modelling uncertainty in the membership functions themselves.',
  },
  {
    to: '/docs/concepts/fuzzy-time-series',
    title: 'Fuzzy time series',
    text: 'Forecasting with Chen-style fuzzy logical relationships.',
  },
  {
    to: '/docs/tutorials/tipping',
    title: 'Tutorial: the tipping problem',
    text: 'Build the classic Mamdani fuzzy controller in Python, step by step.',
  },
];

export default function LearnFuzzyLogic(): ReactNode {
  return (
    <section className={styles.learn}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Learn fuzzy logic</h2>
        <p className={styles.text}>
          Fuzzy logic lets a statement be true to a degree between 0 and 1,
          rather than only true or false. A fuzzy library turns that idea into
          systems you can run: variables, rules and an inference engine.
        </p>
        <ul className={styles.guides}>
          {GUIDES.map(({to, title, text}) => (
            <li key={to}>
              <Link to={to}>{title}</Link>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
