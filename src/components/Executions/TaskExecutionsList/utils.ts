import { leftPaddedNumber } from 'common/formatters';
import { Core, Event } from 'flyteidl';
import { TaskExecutionPhase } from 'models/Execution/enums';
import { TaskExecution } from 'models/Execution/types';

/** Generates a unique name for a task execution, suitable for display in a
 * header and use as a child component key. The name is a combination of task
 * name and retry attempt (if it is not the first attempt).
 * Note: Names are not *globally* unique, just unique within a given `NodeExecution`
 */
export function getUniqueTaskExecutionName({ id }: TaskExecution) {
  const { name } = id.taskId;
  const { retryAttempt } = id;
  const suffix = retryAttempt && retryAttempt > 0 ? ` (${retryAttempt + 1})` : '';
  return `${name}${suffix}`;
}

export function formatRetryAttempt(attempt: number | string | undefined): string {
  let parsed = typeof attempt === 'number' ? attempt : Number.parseInt(`${attempt}`, 10);
  if (Number.isNaN(parsed)) {
    parsed = 0;
  }

  // Retry attempts are zero-based, so incrementing before formatting
  return `Attempt ${leftPaddedNumber(parsed + 1, 2)}`;
}

export const getGroupedLogs = (
  resources: Event.IExternalResourceInfo[],
): Map<TaskExecutionPhase, Core.ITaskLog[]> => {
  const logsInfo = new Map<TaskExecutionPhase, Core.ITaskLog[]>();

  // sort output sample [0-2, 0-1, 0, 1, 2], where 0-1 means index = 0 retry = 1
  resources.sort((a, b) => {
    const aIndex = a.index ?? 0;
    const bIndex = b.index ?? 0;
    if (aIndex !== bIndex) {
      // return smaller index first
      return aIndex - bIndex;
    }

    const aRetry = a.retryAttempt ?? 0;
    const bRetry = b.retryAttempt ?? 0;
    return bRetry - aRetry;
  });

  let lastIndex = -1;
  for (const item of resources) {
    if (item.index === lastIndex) {
      // skip, as we already added final retry to data
      continue;
    }
    const phase = item.phase ?? TaskExecutionPhase.UNDEFINED;
    const currentValue = logsInfo.get(phase);
    lastIndex = item.index ?? 0;
    if (item.logs) {
      // if there is no log with active url, just create an item with externalId,
      // for user to understand which array items are in this state
      const newLogs = item.logs.length > 0 ? item.logs : [{ name: item.externalId }];
      logsInfo.set(phase, currentValue ? [...currentValue, ...newLogs] : [...newLogs]);
    }
  }

  return logsInfo;
};
