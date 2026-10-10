import styles from './AuthForm.module.css';

/** A 16px error with a glyph, so colour is not the only signal. */
export function FieldError({ id, children, role }: { id?: string; children: string; role?: 'alert' }) {
  return (
    <p className={id ? styles.error : styles.failure} id={id} role={role}>
      <svg
        className={styles.errorGlyph}
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.5l8.5 16h-17z" />
        <path d="M12 10v4.5" />
        <path d="M12 17.2h.01" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
