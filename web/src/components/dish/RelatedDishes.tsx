import Image from 'next/image';
import Link from 'next/link';

import type { Dish } from '@/lib/aonik/types';

import styles from './RelatedDishes.module.css';

/** "You might also like" — compact cards linking to sibling dish pages. */
export function RelatedDishes({ dishes }: { dishes: Dish[] }) {
  if (dishes.length === 0) return null;

  return (
    <section className={styles.wrap} aria-labelledby="related-heading">
      <h2 id="related-heading" className={styles.heading}>
        You might also like
      </h2>

      <ul className={styles.grid}>
        {dishes.map((dish) => (
          <li key={dish.id}>
            <Link href={`/menu/${dish.slug}`} className={styles.card}>
              <span className={styles.media}>
                <Image
                  src={dish.imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  className={styles.image}
                  aria-hidden="true"
                />
              </span>
              <span className={styles.text}>
                <span className={styles.title}>{dish.title}</span>
                <span className={styles.nutrition}>
                  {[
                    dish.nutrition.proteinGrams !== undefined &&
                      `Protein ${dish.nutrition.proteinGrams}g`,
                    dish.nutrition.fibreGrams !== undefined &&
                      `Fibre ${dish.nutrition.fibreGrams}g`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
