import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const REPO_URL = 'https://github.com/ParsaBordbar/ferrifuzz';
const DOCS_REPO_URL = 'https://github.com/ParsaBordbar/ferrifuzz_docs';

const SITE_URL = process.env.DOCS_URL ?? 'https://ferrifuzz.bubblelamp.space';
const BASE_URL = process.env.DOCS_BASE_URL ?? '/';
// Where search engines should index the docs, whichever host this build is for. Used for
// canonical/og:url (plugins/canonical-url.ts), the sitemap, JSON-LD and llms.txt.
const CANONICAL_URL = process.env.DOCS_CANONICAL_URL ?? 'https://parsabordbar.github.io/ferrifuzz_docs/';

const DESCRIPTION =
  'Ferrifuzz is an open-source fuzzy logic library for Python and Rust: membership functions, ' +
  'plain-text rules, Mamdani, Sugeno/TSK and interval type-2 inference, and fuzzy time series.';

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${CANONICAL_URL}#website`,
      name: 'Ferrifuzz documentation',
      url: CANONICAL_URL,
      description: DESCRIPTION,
      inLanguage: 'en',
      publisher: {'@id': `${CANONICAL_URL}#author`},
    },
    {
      '@type': 'Person',
      '@id': `${CANONICAL_URL}#author`,
      name: 'Parsa Bordbar',
      url: 'https://github.com/ParsaBordbar',
    },
    {
      '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
      '@id': `${CANONICAL_URL}#software`,
      name: 'ferrifuzz',
      alternateName: 'Ferrifuzz',
      description: DESCRIPTION,
      url: CANONICAL_URL,
      softwareVersion: '0.2.1',
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'Fuzzy logic library',
      operatingSystem: 'Windows, macOS, Linux',
      programmingLanguage: ['Python', 'Rust'],
      runtimePlatform: 'Python 3.9+',
      codeRepository: REPO_URL,
      downloadUrl: 'https://pypi.org/project/ferrifuzz/',
      installUrl: 'https://pypi.org/project/ferrifuzz/',
      license: 'https://www.apache.org/licenses/LICENSE-2.0',
      isAccessibleForFree: true,
      offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
      author: {'@id': `${CANONICAL_URL}#author`},
      keywords:
        'fuzzy logic, fuzzy inference system, Mamdani, Sugeno, TSK, interval type-2 fuzzy sets, ' +
        'Karnik-Mendel, fuzzy time series, membership functions, Python, Rust',
      sameAs: [REPO_URL, 'https://pypi.org/project/ferrifuzz/'],
    },
  ],
};

const config: Config = {
  title: 'Ferrifuzz',
  tagline: 'Fuzzy logic for Python and Rust. Built for uncertainty, engineered for speed.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // Set the domain and path at build time:
  //   npm run build                                   → https://ferrifuzz.bubblelamp.space/ (the default, VPS)
  //   DOCS_URL=https://parsabordbar.github.io DOCS_BASE_URL=/ferrifuzz_docs/ npm run build
  //                                                   → GitHub Pages (.github/workflows/pages.yml)
  // Both builds point canonical URLs at CANONICAL_URL. DOCS_NOINDEX=1 adds
  // <meta name="robots" content="noindex"> to every page (e.g. for a preview).
  url: SITE_URL,
  baseUrl: BASE_URL,
  // Explicit, so GitHub Pages serves every page without a redirect.
  trailingSlash: true,
  noIndex: process.env.DOCS_NOINDEX === '1',

  organizationName: 'ParsaBordbar',
  projectName: 'ferrifuzz',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify(STRUCTURED_DATA),
    },
  ],

  // KaTeX stylesheet for the math rendered by remark-math / rehype-katex.
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.38/dist/katex.min.css',
      type: 'text/css',
      crossorigin: 'anonymous',
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          editUrl: `${DOCS_REPO_URL}/edit/main/`,
        },
        blog: false,
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: [`${BASE_URL}404.html`, `${BASE_URL}search/**`],
          createSitemapItems: async ({defaultCreateSitemapItems, ...params}) =>
            (await defaultCreateSitemapItems(params)).map((item) => ({
              ...item,
              url: item.url.replace(SITE_URL + BASE_URL, CANONICAL_URL),
            })),
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    ['./plugins/canonical-url.ts', {canonicalUrl: CANONICAL_URL}],
    [
      './plugins/llms-txt.ts',
      {
        canonicalUrl: CANONICAL_URL,
        title: 'Ferrifuzz',
        summary:
          'Ferrifuzz is an open-source (Apache-2.0) fuzzy logic library with a pure-Rust core and a ' +
          'Python package. It provides membership functions, linguistic variables and hedges, ' +
          't-norms and t-conorms, plain-text IF-THEN rules, Mamdani, Sugeno/TSK and interval type-2 ' +
          '(Karnik-Mendel) inference, and Chen fuzzy time series forecasting.',
        details: [
          '- Python: `pip install ferrifuzz`, then `import ferrifuzz as ff` (https://pypi.org/project/ferrifuzz/).',
          '- Rust: the `ferrifuzz` crate exposes the same engine.',
          `- Source code and issues: ${REPO_URL}`,
          '- VS Code extension: https://marketplace.visualstudio.com/items?itemName=ParsaBordbar2003.ferrifuzz',
        ].join('\n'),
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    metadata: [
      {name: 'description', content: DESCRIPTION},
      {
        name: 'keywords',
        content:
          'fuzzy logic, fuzzy logic python, fuzzy logic rust, fuzzy inference system, mamdani, ' +
          'sugeno, takagi-sugeno-kang, interval type-2 fuzzy, karnik-mendel, fuzzy time series, ' +
          'membership functions, linguistic variables, defuzzification, fuzzy control',
      },
      {name: 'author', content: 'Parsa Bordbar'},
      {name: 'twitter:card', content: 'summary_large_image'},
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Ferrifuzz',
      logo: {
        alt: 'Ferrifuzz Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/docs/tutorials/tipping', label: 'Tutorials', position: 'left'},
        {to: '/docs/python-api/overview', label: 'Python API', position: 'left'},
        {to: '/docs/rust-api/overview', label: 'Rust API', position: 'left'},
        {
          href: REPO_URL,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Installation', to: '/docs/getting-started/installation'},
            {label: 'Your first system', to: '/docs/getting-started/first-system'},
            {label: 'Concepts', to: '/docs/concepts/what-is-fuzzy'},
            {label: 'Tutorials', to: '/docs/tutorials/tipping'},
          ],
        },
        {
          title: 'Reference',
          items: [
            {label: 'Rule syntax', to: '/docs/rule-syntax'},
            {label: 'Python API', to: '/docs/python-api/overview'},
            {label: 'Rust API', to: '/docs/rust-api/overview'},
            {label: 'FAQ', to: '/docs/faq'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: REPO_URL},
            {label: 'Issues', href: `${REPO_URL}/issues`},
            {label: 'How to cite & license', to: '/docs/cite-license'},
          ],
        },
      ],
      copyright: `Copyright © 2025-${new Date().getFullYear()} Parsa Bordbar and the ferrifuzz contributors. Licensed under Apache-2.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
