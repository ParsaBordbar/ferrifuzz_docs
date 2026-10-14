import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// Explicit sidebar so the reading order is deliberate.
// Doc ids are file paths relative to docs/ without the extension.
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/first-system',
        'getting-started/error-messages',
        'getting-started/migrating-from-0.1',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/what-is-fuzzy',
        'concepts/membership-functions',
        'concepts/linguistic-variables',
        'concepts/operators',
        'concepts/inference',
        'concepts/defuzzification',
        'concepts/interval-type-2',
        'concepts/fuzzy-time-series',
      ],
    },
    {
      type: 'doc',
      id: 'rule-syntax',
      label: 'Rule Syntax',
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/tipping',
        'tutorials/tank-control',
        'tutorials/sugeno-approximation',
        'tutorials/enrollment-forecasting',
        'tutorials/type1-vs-it2',
      ],
    },
    {
      type: 'category',
      label: 'Python API',
      items: [
        'python-api/overview',
        'python-api/membership',
        'python-api/variable',
        'python-api/rule',
        'python-api/operators-hedges',
        'python-api/fuzzy-system',
        'python-api/fts',
        'python-api/metrics',
        'python-api/plot',
      ],
    },
    {
      type: 'category',
      label: 'Rust API',
      items: [
        'rust-api/overview',
        'rust-api/membership',
        'rust-api/variable',
        'rust-api/rules',
        'rust-api/operators-hedges',
        'rust-api/system',
        'rust-api/it2',
        'rust-api/fts',
        'rust-api/metrics',
      ],
    },
    {
      type: 'doc',
      id: 'editor-support',
      label: 'Editor Support',
    },
    {
      type: 'doc',
      id: 'faq',
      label: 'FAQ',
    },
    {
      type: 'doc',
      id: 'cite-license',
      label: 'Cite & License',
    },
  ],
};

export default sidebars;
