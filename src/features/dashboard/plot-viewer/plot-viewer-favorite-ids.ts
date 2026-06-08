/**
 * Helpers for ordering plot-viewer favorites panel rows from Atlas favorite experiment ids.
 */

/**
 * Orders browse groups to match `experimentIds`; drops ids with no resolved group row.
 */
export function orderBrowseGroupsByExperimentIds<T extends { experimentId: string }>(
  groups: readonly T[],
  experimentIds: readonly string[],
): T[] {
  const byId = new Map(groups.map((group) => [group.experimentId, group]));
  const ordered: T[] = [];
  for (const experimentId of experimentIds) {
    const group = byId.get(experimentId);
    if (group) {
      ordered.push(group);
    }
  }
  return ordered;
}
