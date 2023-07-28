/* Simple function to return a dynamically set version. */
declare var __VERSION__: string;
declare var __DATE_BUILT__: string;

export function getVersion(): string {
    return __VERSION__;
}
