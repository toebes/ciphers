import * as katex from "katex";

export interface StringMap {
    [index: string]: string;
}

export interface BoolMap {
    [index: string]: boolean;
}

export interface NumberMap {
    [index: string]: number;
}

/**
 * Makes a deep copy of any object
 * @param source Object to copy
 */
export function cloneObject(source: object): object {
    let clone = {};
    if (source !== null) {
        for (let elem of Object.keys(source)) {
            if (source[elem] != null && typeof source[elem] === "object") {
                clone[elem] = cloneObject(source[elem]);
            } else {
                clone[elem] = source[elem];
            }
        }
    }
    return clone;
}
/**
 * Replaces a character in a string at a given position
 * (The reverse of substr)
 * @param str String to update
 * @param index Position to set character
 * @param chr New character to put into position
 */
export function setCharAt(str: string, index: number, chr: string): string {
    if (index > str.length - 1) {
        return str;
    }
    return str.substr(0, index) + chr + str.substr(index + 1);
}
/**
 * Render a LaTeX math string with katex.
 * See https://khan.github.io/KaTeX/docs/supported.html for everything supported
 * @param str LaTeX formatted string
 */
export function renderMath(str: string): JQuery<HTMLElement> {
    return $(katex.renderToString(str));
}
/**
 * Make multiple copies of a string concatenated
 * @param c Character(or string) to repeat
 * @param count number of times to repeat the string
 */
export function repeatStr(c: string, count: number): string {
    let res = "";
    for (let i = 0; i < count; i++) {
        res += c;
    }
    return res;
}
/**
 *
 * @param c String to pad
 * @param m String to match length of
 */
export function padToMatch(c: string, m: string): string {
    return c + repeatStr(" ", m.length - c.length);
}
/**
 * Set the disabled state on a JQuery selected set of elements
 * @param sel JQuery Selector string to select elements to affect
 * @param disabled Boolean indicating whether to disable or enable
 */
export function setDisabled(sel: string, disabled: boolean): void {
    if (disabled) {
        $(sel).prop("disabled", true);
    } else {
        $(sel).removeAttr("disabled");
    }
}
