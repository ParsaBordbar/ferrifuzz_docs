// The tipping system from docs/getting-started/first-system.md, computed in the browser so
// the homepage demo can run without a server. Mamdani inference: min AND, max aggregation,
// centroid defuzzification. Keep the terms below in sync with that page.

export type Term = 'poor' | 'good' | 'excellent';

export const SERVICE_MIN = 0;
export const SERVICE_MAX = 10;

type Mf = (x: number) => number;

const triangle =
  (a: number, b: number, c: number): Mf =>
  (x) => {
    if (x <= a || x >= c) return 0;
    return x <= b ? (x - a) / (b - a) : (c - x) / (c - b);
  };

// A flat shoulder (a === b or c === d) counts as full membership, as it does in ferrifuzz.
const trapezoid =
  (a: number, b: number, c: number, d: number): Mf =>
  (x) => {
    if (x < a || x > d) return 0;
    if (x >= b && x <= c) return 1;
    return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
  };

export const SERVICE_TERMS: Record<Term, Mf> = {
  poor: trapezoid(0, 0, 2, 5),
  good: triangle(2, 5, 8),
  excellent: trapezoid(5, 8, 10, 10),
};

const TIP_TERMS: Record<Term, Mf> = {
  poor: triangle(0, 5, 10), // IF service IS poor THEN tip IS low
  good: triangle(10, 15, 20), // IF service IS good THEN tip IS medium
  excellent: triangle(20, 25, 30), // IF service IS excellent THEN tip IS high
};

const TERMS = Object.keys(SERVICE_TERMS) as Term[];
const TIP_MAX = 30;
const STEPS = 1000;

export function fuzzify(service: number): Record<Term, number> {
  return {
    poor: SERVICE_TERMS.poor(service),
    good: SERVICE_TERMS.good(service),
    excellent: SERVICE_TERMS.excellent(service),
  };
}

export function computeTip(service: number): number {
  const degrees = fuzzify(service);
  let area = 0;
  let moment = 0;
  for (let i = 0; i <= STEPS; i += 1) {
    const x = (i / STEPS) * TIP_MAX;
    const y = Math.max(...TERMS.map((t) => Math.min(degrees[t], TIP_TERMS[t](x))));
    area += y;
    moment += x * y;
  }
  return area === 0 ? 0 : moment / area;
}
