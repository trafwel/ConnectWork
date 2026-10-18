// Types for scripts/check-dev.mjs (plain JS so an old Node can run it), used by its test.
export const NODE_RANGE_TEXT: string;
export function nodeOk(version: string): boolean;
export function portFree(port: number): Promise<boolean>;
export function whoHolds(port: number): string;
export function portBusyMessage(port: number, holder: string, platform?: string): string;
export function nodeMessage(version: string): string;
