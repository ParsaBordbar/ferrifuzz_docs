import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const REPO_URL = 'https://github.com/ParsaBordbar/ferrifuzz';

const config: Config = {
  title: 'Ferrifuzz',
  tagline: 'Fuzzy logic for Python and Rust. Built for uncertainty, engineered for speed.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // Served from the root of its own domain. Set the domain at build time:
  //   DOCS_URL=https://ferrifuzz.bubblelamp.space npm run build (the default)
  // Until DOCS_PUBLIC=1 the site asks search engines not to index it (tester preview).
  url: process.env.DOCS_URL ?? 'https://ferrifuzz.bubblelamp.space',
  baseUrl: '/',
  noIndex: process.env.DOCS_PUBLIC !== '1',

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
          // No editUrl: the source repository is private for now, so
          // "edit this page" links would 404 for readers.
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
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
