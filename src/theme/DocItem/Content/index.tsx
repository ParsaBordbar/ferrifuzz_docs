import type {ComponentProps, ReactNode} from 'react';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Content from '@theme-original/DocItem/Content';
import CopyForLlm from '@site/src/components/CopyForLlm';
import styles from './styles.module.css';

type Props = ComponentProps<typeof Content>;

// Adds the "Copy for LLM" button above every docs page. The Markdown it copies is written
// next to each page by plugins/llms-txt.ts.
export default function ContentWrapper(props: Props): ReactNode {
  const {permalink} = useDoc().metadata;
  const folder = permalink.endsWith('/') ? permalink : `${permalink}/`;
  return (
    <>
      <div className={styles.bar}>
        <CopyForLlm url={`${folder}index.md`} />
      </div>
      <Content {...props} />
    </>
  );
}
