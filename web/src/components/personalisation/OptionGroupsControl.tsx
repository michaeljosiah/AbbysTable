import type { MappedOptionGroup } from '../../lib/aonik/map';
import { selectChoice, type PersonalisationDraft } from '../../lib/aonik/personalisation';
import { formatSignedPrice } from '../../lib/format';

export interface OptionGroupControlClasses {
  group?: string;
  title?: string;
  caption?: string;
  choices?: string;
  choice?: string;
  choiceLabel?: string;
  choiceDetail?: string;
  choicePrice?: string;
  defaultNote?: string;
}

interface OptionGroupControlProps {
  group: MappedOptionGroup;
  selected: string[];
  onSelect: (selected: string[]) => void;
  classes?: OptionGroupControlClasses;
}

/** One generic rendered group. Empty groups deliberately render nothing. */
export function OptionGroupControl({
  group,
  selected,
  onSelect,
  classes = {},
}: OptionGroupControlProps) {
  if (group.choices.length === 0) return null;
  const defaultChoice = group.choices.find((choice) => choice.key === group.defaultChoiceKey);

  return (
    <fieldset className={classes.group}>
      <legend className={classes.title}>
        {group.label}
        {group.helpText ? <span className={classes.caption}>{group.helpText}</span> : null}
      </legend>
      <div className={classes.choices}>
        {group.choices.map((choice) => {
          const isSelected = selected.includes(choice.key);
          return (
            <button
              key={choice.key}
              type="button"
              className={classes.choice}
              data-selected={isSelected || undefined}
              aria-pressed={isSelected}
              onClick={() => onSelect(selectChoice(group, selected, choice.key))}
            >
              <span className={classes.choiceLabel}>{choice.label}</span>
              {choice.detail ? <span className={classes.choiceDetail}>{choice.detail}</span> : null}
              {choice.pricePence !== 0 ? (
                <span className={classes.choicePrice}>{formatSignedPrice(choice.pricePence)}</span>
              ) : null}
              {isSelected ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--white)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
      {defaultChoice ? (
        <p className={classes.defaultNote}>{defaultChoice.label} is Abby&apos;s choice.</p>
      ) : null}
    </fieldset>
  );
}

interface OptionGroupsControlProps {
  groups: MappedOptionGroup[];
  selection: PersonalisationDraft;
  onChange: (groupKey: string, selected: string[]) => void;
  classes?: OptionGroupControlClasses;
}

/** Shared Step 2/review group list; an empty effective set has no placeholder panel. */
export function OptionGroupsControl({
  groups,
  selection,
  onChange,
  classes,
}: OptionGroupsControlProps) {
  const selectableGroups = groups.filter((group) => group.choices.length > 0);
  if (selectableGroups.length === 0) return null;

  return selectableGroups.map((group) => (
    <OptionGroupControl
      key={group.key}
      group={group}
      selected={selection[group.key] ?? []}
      onSelect={(selected) => onChange(group.key, selected)}
      classes={classes}
    />
  ));
}
