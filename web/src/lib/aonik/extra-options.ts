import type { MappedOptionGroup } from './map';

/** Local fixtures use short keys; Aonik's tenant-global keys are namespaced. */
export function extraOptionKind(
  group: Pick<MappedOptionGroup, 'key'>,
): 'heat' | 'size' | 'option' {
  if (group.key === 'heat' || group.key.endsWith('-heat')) return 'heat';
  if (group.key === 'size' || group.key.endsWith('-size')) return 'size';
  return 'option';
}
