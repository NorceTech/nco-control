import deepDiffPkg from 'deep-diff';
import type { Diff } from 'deep-diff';
const { diff: deepDiff } = deepDiffPkg;
import type { FieldDiff } from '../plan/types.js';

/**
 * Compare two configuration objects and generate field-level diffs
 *
 * @param local - Local (new) configuration
 * @param remote - Remote (old) configuration
 * @returns Array of field-level differences
 */
export function diffConfigs(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): FieldDiff[] {
  const differences = deepDiff(remote, local);

  if (!differences) {
    return [];
  }

  return differences
    .filter(isRelevantDiff)
    .map(convertDiff);
}

/**
 * Filter out irrelevant diffs (like $schema which shouldn't be compared)
 */
function isRelevantDiff(d: Diff<unknown, unknown>): boolean {
  // Skip $schema field changes - schema is metadata, not config
  if (d.path && d.path[0] === '$schema') {
    return false;
  }
  return true;
}

/**
 * Convert deep-diff result to FieldDiff format
 */
function convertDiff(d: Diff<unknown, unknown>): FieldDiff {
  const path = '/' + (d.path ?? []).join('/');

  switch (d.kind) {
    case 'N': // New (added)
      return {
        path,
        type: 'add',
        newValue: d.rhs,
      };

    case 'D': // Deleted (removed)
      return {
        path,
        type: 'remove',
        oldValue: d.lhs,
      };

    case 'E': // Edited (changed)
      return {
        path,
        type: 'change',
        oldValue: d.lhs,
        newValue: d.rhs,
      };

    case 'A': // Array change
      // Handle array element changes
      const arrayPath = `${path}/${d.index}`;
      if (d.item.kind === 'N') {
        return {
          path: arrayPath,
          type: 'add',
          newValue: (d.item as { kind: 'N'; rhs: unknown }).rhs,
        };
      } else if (d.item.kind === 'D') {
        return {
          path: arrayPath,
          type: 'remove',
          oldValue: (d.item as { kind: 'D'; lhs: unknown }).lhs,
        };
      } else {
        const editItem = d.item as { kind: 'E'; lhs: unknown; rhs: unknown };
        return {
          path: arrayPath,
          type: 'change',
          oldValue: editItem.lhs,
          newValue: editItem.rhs,
        };
      }

    default:
      // Shouldn't happen, but handle gracefully
      return {
        path,
        type: 'change',
      };
  }
}

/**
 * Check if two configs are identical (no differences)
 */
export function configsEqual(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): boolean {
  return diffConfigs(local, remote).length === 0;
}
