/**
 * Projection stub (Arke scaffolding).
 *
 * Deterministically projects a specification/status change onto an external system of record
 * (issue tracker, docs, …). Every projection is logged as a governed action. Replace the body
 * with your project's real projection; keep it deterministic and side-effect-logged.
 */
export interface ProjectionInput {
  specId: string;
  trigger: string;
}

export async function project(_input: ProjectionInput): Promise<void> {
  // no-op stub
}
