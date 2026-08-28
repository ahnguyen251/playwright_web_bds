import type { ReportingRuntimeHandle } from '../../server/runtime';

export type ReportingRuntimeCloseResult = ReturnType<ReportingRuntimeHandle['close']>;

const awaitedCloseResult: ReportingRuntimeCloseResult = Promise.resolve();
void awaitedCloseResult;
