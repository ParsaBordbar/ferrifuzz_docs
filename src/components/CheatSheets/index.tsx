import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

// Files live in static/cheatsheets/ as <file>.pdf and <file>.png (800 x 2000).
const SHEETS = [
  {
    file: '01-getting-started',
    title: 'Getting started',
    description: 'Install Ferrifuzz, define variables, then build, run and debug a system.',
  },
  {
    file: '02-rule-syntax',
    title: 'Rule syntax',
    description: 'IF-THEN grammar, AND/OR precedence, NOT, hedges, weights and rule errors.',
  },
  {
    file: '03-membership-operators',
    title: 'Membership functions and operators',
    description: 'Function shapes, interval type-2, AND/OR operators, complements and hedges.',
  },
];

function Sheet({file, title, description}: (typeof SHEETS)[number]): ReactNode {
  const base = useBaseUrl(`/cheatsheets/${file}`);
  const downloadName = `ferrifuzz-cheat-sheet-${file}`;
  return (
    <li className={styles.sheet}>
      <a
        className={styles.preview}
        href={`${base}.pdf`}
        aria-label={`Open the ${title} cheat sheet as a PDF`}>
        <img
          src={`${base}.png`}
          alt=""
          width={800}
          height={2000}
          loading="lazy"
          decoding="async"
        />
      </a>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <div className={styles.downloads}>
        <a
          className={styles.pdf}
          href={`${base}.pdf`}
          download={`${downloadName}.pdf`}
          aria-label={`Download PDF of the ${title} cheat sheet`}>
          <span className={styles.icon} aria-hidden="true" />
          PDF
        </a>
        <a
          className={styles.png}
          href={`${base}.png`}
          download={`${downloadName}.png`}
          aria-label={`Download PNG of the ${title} cheat sheet`}>
          <span className={styles.icon} aria-hidden="true" />
          PNG
        </a>
      </div>
    </li>
  );
}

export default function CheatSheets(): ReactNode {
  return (
    <ul className={styles.sheets}>
      {SHEETS.map((sheet) => (
        <Sheet key={sheet.file} {...sheet} />
      ))}
    </ul>
  );
}
