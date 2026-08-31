---
spec_id: SPEC-2026-08-31-effective-option-groups
title: Effective option groups in the storefront
status: approved
branch: feat/effective-option-groups
owner: michaeljosiah
capabilities: [catalogue, personalisation, extras]
created: 2026-08-31
updated: 2026-08-31
---

# Effective option groups in the storefront

## Why

Aonik already returns each product's effective option groups with the real group key, label,
selection mode, default and choice keys. The storefront immediately adapts that complete model into
four fixed buckets (`portion`, `protein`, `sides`, `heat`), discarding arbitrary keys and `Multi`
cardinality. Cart responses then flatten arrays to one value. This prevents a lossless cart edit and
makes authored product configuration less capable than the UI contract.

This unit removes that adapter and renders the existing `MappedOptionGroup[]` directly. It changes
no Aonik contract and introduces no new canonical option type.

Depends on: `SPEC-2026-07-22-catalog-browse`, Aonik Specs 066 and 067.

## Constraints

- Follow KISS: reuse `MappedOptionGroup`, `PersonalisationSelection`, `encodeSelection` and
  `decodeSelection`; do not create a form framework, schema language or second option hierarchy.
- Known group keys MAY select presentation details such as heat icons, but SHALL NOT control which
  groups render or how values encode.
- Demo fixtures SHALL be mapped into the same group model at their boundary; the generic UI SHALL
  not maintain a separate demo implementation.
- Selection-dependent nutrition/content resolution, committed-cart projection and cart mutation
  wiring are separate units.

## Requirements

### Requirement: Every effective group renders
`capability: personalisation` · `delta: MODIFIED (feat/effective-option-groups)`

Dish detail, box dish selection, review editing and add-on personalisation SHALL render the ordered
effective groups supplied for that product. A product with no groups SHALL omit the personaliser.
An unfamiliar group key such as `garnish` SHALL render without a code change.

#### Scenario: Unknown key is ordinary configuration
- **WHEN** a product has a `One` group keyed `garnish`
- **THEN** its authored label, help text, choices and default render in authored order
- **AND** selecting it records the choice key under `garnish`

### Requirement: One and Multi preserve cardinality
`capability: personalisation` · `delta: MODIFIED (feat/effective-option-groups)`

A `One` group SHALL allow exactly one selected choice and encode a string. A `Multi` group SHALL
allow multiple selected choices and encode an array, including when one choice is selected. UI
draft state SHALL preserve all selected keys while an editor is open and when it is reopened from
the same caller state. Reload from a committed cart belongs to `live-cart-convergence`.

#### Scenario: Multi selection is lossless
- **WHEN** two choices are selected in a `Multi` group
- **THEN** both remain selected when the editor reopens
- **AND** the encoded value is an array containing both keys

### Requirement: Defaults are explicit in editable state
`capability: personalisation` · `delta: MODIFIED (feat/effective-option-groups)`

An editor opened without a stored custom selection SHALL initialise every group from
`defaultChoiceKey`. Resetting a customised selection SHALL restore those keys. The existing
`encodeSelection` helper SHALL gain one explicit `omitDefaults` policy parameter, defaulting to
`true` for adds. Passing `false` for an edit SHALL emit the complete canonical default selection.
No second encoder SHALL be introduced.

#### Scenario: Reset restores authored defaults
- **WHEN** a customer resets a customised product
- **THEN** every group contains its authored default key
- **AND** no label is stored or sent as an identifier

### Requirement: Demo and live use one renderer
`capability: personalisation` · `delta: MODIFIED (feat/effective-option-groups)`

Demo personalisation fixtures SHALL be represented as effective groups before reaching components.
Components SHALL not branch into fixed demo controls versus generic live controls.

### Requirement: Multi pricing does not guess
`capability: personalisation` · `delta: MODIFIED (feat/effective-option-groups)`

Individual authored choice deltas MAY render. An aggregate pre-commit surcharge SHALL be omitted
when the draft contains a `Multi` group because the effective adjustment subtracts the default once
across the complete selection. Committed-cart money remains Aonik quote data. A future
selection-quote unit may restore an aggregate preview without changing the group UI.

#### Scenario: Multi preview is honest
- **WHEN** a draft contains one or more selected values in a `Multi` group
- **THEN** individual choice deltas may render but no aggregate surcharge is calculated locally

## Design

Use one shape end to end:

```text
MappedOptionGroup[] + Record<groupKey, choiceKey[]>
                      |
                      +-- One  -> PersonalisationSelection[group] = choiceKey
                      +-- Multi -> PersonalisationSelection[group] = choiceKey[]
```

Extract only a small reusable group control if required by the four existing surfaces. Keep
product-specific copy and layout in those surfaces; share selection behavior, not whole dialogs.

## Tasks

- [x] `T1` Represent demo fixtures as `MappedOptionGroup[]`
- [x] `T2` Remove the fixed `PersonalisationOptions` adapter and known-key filtering contract
- [x] `T3` Render ordered `One` and `Multi` controls from effective groups
- [x] `T4` Store and emit choice keys with explicit add/edit default policy
- [x] `T5` Omit locally-derived aggregate pricing for `Multi` drafts
- [x] `T6` Add focused encode/decode/default/cardinality tests and smoke all four surfaces

## Definition of done

- All scenarios pass in demo and live modes.
- No production component treats labels as option identifiers.
- No `Multi` value is flattened.
- An arbitrary authored group renders and round-trips without code changes.
- No aggregate `Multi` surcharge is derived client-side.
- Tests, lint, typecheck and production build pass.
