import Link from 'next/link';
import { Fragment } from 'react';

import { Keep, KeepCompounds } from '@/components/sections/KeepTogether';
import type { ResolvedBlock, ResolvedInline } from '@/lib/content/deliveryFaqs';

import styles from './Faq.module.css';

/**
 * One FAQ answer from its content blocks (`lib/content/deliveryFaqs.ts`). No
 * state, so the server-rendered groups and the client-side search results
 * render answers with the very same markup — bold values and lists survive
 * into the results, as the design requires, without a second copy.
 */
export function FaqAnswer({ blocks }: { blocks: ResolvedBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if ('p' in block) {
          return (
            <p key={index} className={styles.answerP}>
              <Inline nodes={block.p} />
            </p>
          );
        }
        if ('list' in block) {
          return (
            <ul key={index} className={styles.answerList}>
              {block.list.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline nodes={item} />
                </li>
              ))}
            </ul>
          );
        }
        // The arrows are decoration: the steps are read as a sequence.
        return (
          <p key={index} className={styles.journey}>
            {block.journey.map((step, stepIndex) => (
              <Fragment key={stepIndex}>
                {stepIndex > 0 ? (
                  <>
                    {' '}
                    <span className={styles.journeyArrow} aria-hidden="true">
                      →
                    </span>{' '}
                  </>
                ) : null}
                {step}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function Inline({ nodes }: { nodes: ResolvedInline[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (typeof node === 'string') return <KeepCompounds key={index} text={node} />;
        if ('strong' in node) {
          return (
            <strong key={index}>
              <Inline nodes={node.strong} />
            </strong>
          );
        }
        if ('link' in node) {
          return (
            <Link key={index} href={node.link} className={styles.answerLink}>
              {node.text}
            </Link>
          );
        }
        return <Keep key={index}>{node.keep}</Keep>;
      })}
    </>
  );
}
