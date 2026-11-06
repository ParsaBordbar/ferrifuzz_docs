import {useEffect, useRef, useState} from 'react';
import type {PointerEvent, ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import InstallCommand from '@site/src/components/InstallCommand';
import {
  computeTip,
  fuzzify,
  SERVICE_MAX,
  SERVICE_MIN,
  type Term,
} from './tipper';
import styles from './styles.module.css';

const HEADLINE = 'Built for uncertainty. Engineered for speed.';
const LETTER_COUNT = HEADLINE.replace(/ /g, '').length;

// The page opens at START and glides to END once, which shows what the control does.
const START = 3.5;
const END = 7.5;
const SWEEP_DELAY_MS = 350;
const SWEEP_MS = 1500;

const WEIGHT_MIN = 300;
const WEIGHT_MAX = 900;

const RULES: {term: Term; text: string}[] = [
  {term: 'poor', text: 'IF service IS poor THEN tip IS low'},
  {term: 'good', text: 'IF service IS good THEN tip IS medium'},
  {term: 'excellent', text: 'IF service IS excellent THEN tip IS high'},
];

const TICKS = [0, 2, 4, 6, 8, 10];

const toWeight = (degree: number) =>
  Math.round(WEIGHT_MIN + (WEIGHT_MAX - WEIGHT_MIN) * degree);

// Each letter's weight is its membership in a gaussian centred on the slider's position.
function letterWeight(index: number, service: number): number {
  const position = index / (LETTER_COUNT - 1);
  const centre = (service - SERVICE_MIN) / (SERVICE_MAX - SERVICE_MIN);
  const sigma = 0.16;
  return toWeight(Math.exp(-0.5 * ((position - centre) / sigma) ** 2));
}

function Headline({service}: {service: number}): ReactNode {
  const logo = useBaseUrl('/img/logo.svg');
  let index = -1;
  return (
    <h1 className={styles.headline} aria-label={`Ferrifuzz: ${HEADLINE}`}>
      <span className={styles.brand} aria-hidden="true">
        <img className={styles.logo} src={logo} alt="" width={44} height={44} />
        Ferrifuzz
      </span>
      {HEADLINE.split(' ').map((word, wordIndex) => (
        <span key={wordIndex} aria-hidden="true">
          <span className={styles.word}>
            {[...word].map((letter, i) => {
              index += 1;
              return (
                <span key={i} style={{fontWeight: letterWeight(index, service)}}>
                  {letter}
                </span>
              );
            })}
          </span>{' '}
        </span>
      ))}
    </h1>
  );
}

function Curves(): ReactNode {
  return (
    <svg
      className={styles.curves}
      viewBox="0 -2 1000 104"
      preserveAspectRatio="none"
      aria-hidden="true">
      <path className={styles.poorCurve} d="M0 100 V0 H200 L500 100 Z" />
      <path className={styles.goodCurve} d="M200 100 L500 0 L800 100 Z" />
      <path className={styles.excellentCurve} d="M500 100 L800 0 H1000 V100 Z" />
      <line className={styles.baseline} x1="0" y1="100" x2="1000" y2="100" />
    </svg>
  );
}

export default function FuzzyHero(): ReactNode {
  const [service, setService] = useState(START);
  const dragging = useRef(false);
  const stopSweep = useRef<() => void>(() => {});

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    let frame = 0;
    let startedAt = 0;
    const tick = (now: number) => {
      startedAt = startedAt || now;
      const t = Math.min(1, (now - startedAt) / SWEEP_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setService(START + (END - START) * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, SWEEP_DELAY_MS);
    stopSweep.current = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    return stopSweep.current;
  }, []);

  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const {left, width} = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width));
    setService(Math.round(ratio * 100) / 10);
  };

  const degrees = fuzzify(service);
  const tip = computeTip(service);
  const serviceText = service.toFixed(1);
  const tipText = tip.toFixed(1);

  return (
    <header className={styles.hero}>
      <div className={styles.inner}>
        <Headline service={service} />

        <div className={styles.lead}>
          <p className={styles.summary}>
            Ferrifuzz is a fuzzy logic library for Python and Rust. It builds
            Mamdani, Sugeno/TSK and interval type-2 fuzzy inference systems from
            plain-text rules, forecasts with fuzzy time series, and gives clear
            error messages when something is off. The core is pure Rust.
          </p>
          <div className={styles.actions}>
            <InstallCommand />
            <Link
              className={styles.cta}
              to="/docs/getting-started/installation">
              Get started
            </Link>
          </div>
        </div>

        <section className={styles.demo} aria-labelledby="tipping-demo-title">
          <h2 id="tipping-demo-title" className={styles.demoTitle}>
            How much should you tip? Drag the line to rate the service.
          </h2>

          <div className={styles.termNames} aria-hidden="true">
            <span className={styles.poorText}>poor</span>
            <span className={styles.goodText}>good</span>
            <span className={styles.excellentText}>excellent</span>
          </div>

          <div
            className={styles.chart}
            onPointerDown={(event) => {
              stopSweep.current();
              dragging.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              setFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (dragging.current) {
                setFromPointer(event);
              }
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}>
            <Curves />
            <input
              className={styles.slider}
              type="range"
              min={SERVICE_MIN}
              max={SERVICE_MAX}
              step={0.1}
              value={service}
              aria-label="Service rating from 0 to 10"
              aria-valuetext={`${serviceText} out of 10, ${tipText} percent tip`}
              onChange={(event) => {
                stopSweep.current();
                setService(event.target.valueAsNumber);
              }}
            />
            <div
              className={styles.marker}
              style={{left: `${service * 10}%`}}
              aria-hidden="true">
              <span className={styles.handle} />
            </div>
            {RULES.map(({term}) =>
              degrees[term] > 0 ? (
                <span
                  key={term}
                  className={styles[`${term}Dot`]}
                  style={{
                    left: `${service * 10}%`,
                    top: `${(1 - degrees[term]) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              ) : null,
            )}
          </div>

          <div className={styles.axis} aria-hidden="true">
            {TICKS.map((tick) => (
              <span key={tick} style={{left: `${tick * 10}%`}}>
                {tick}
              </span>
            ))}
          </div>

          <div className={styles.outcome}>
            <p className={styles.result}>
              Service at <strong>{serviceText}</strong> out of 10 gives a{' '}
              <strong>{tipText}%</strong> tip.
            </p>
            <ul className={styles.rules}>
              {RULES.map(({term, text}) => (
                <li
                  key={term}
                  className={degrees[term] > 0 ? styles[`${term}Text`] : undefined}
                  style={{fontWeight: toWeight(degrees[term])}}>
                  <code>{text}</code>
                  <span>{degrees[term].toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </header>
  );
}
