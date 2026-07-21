/**
 * Permission policy stub (Arke scaffolding).
 *
 * Classifies a requested action into a risk tier so the coordinator can decide whether it runs
 * in-band, requires confirmation, or is marshalled into a durable proposal. Replace the body with
 * your project's real policy; the shape is what the coordinator expects.
 */
export type ActionTier = "low" | "medium" | "high";

export function classify(action: { name: string }): ActionTier {
  // Default-closed: anything not explicitly classified is treated as high-risk.
  return "high";
}
