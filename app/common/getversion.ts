/* Simple function to return a dynamically set version. */
declare var __VERSION__: string;
declare var __DATE_BUILT__: string;

export function getVersion(): string {
    console.log('getVersion:' + __VERSION__ + " date Built:" + __DATE_BUILT__)
    return __VERSION__;
}
