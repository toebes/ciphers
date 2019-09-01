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
            if (source[elem] === null) {
                clone[elem] = null;
            } else if (Array.isArray(source[elem])) {
                clone[elem] = source[elem].slice();
            } else if (typeof source[elem] === "object") {
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
 * Remove all whitespace from a string and convert it to all upper case.
 * @param text String to remove whitespace from
 * @param keepCase Boolean indicating you want the string back without bein coverted to upper case
 */
export function sanitizeString(text: string, keepCase: boolean = false): string {
    let returnValue: string = text.replace(/[\s,.?'";:!$&-+=]/g, "");
    if (!keepCase) {
        returnValue = returnValue.toUpperCase();
    }
    return returnValue;
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
/**
 * Take any number and pad it on the left with spaces, returning the right most
 * width digits of the formatted string.  Note that if the number is wider than
 * the width, it will be truncated.
 * @param val Value to pad
 * @param width Number of spaces to pad/truncate the number to
 */
export function padLeft(val: number, width: number): string {
    let result = repeatStr(" ", width) + String(val);
    return result.slice(-width);
}
/**
 * Determines the longest starting string from a keystring
 * @param str Key string to extract
 */
export function extractKey(str: string): string {
    let lastc;
    for (let i = str.length - 1; i >= 0; i--) {
        let c = str.substr(i, 1);
        if (c !== "?") {
            if (lastc !== undefined && c > lastc) {
                return str.substr(0, i + 1);
            }
        }
        lastc = c;
    }
    return "";
}
/**
 * Determines the best key for a polybius square.  This checks horizontal,
 * vertical and both clockwise and counter clockwise for a polybius square
 * regardless of the size.
 * @param polybius (hopefully) Square array of strings
 */
export function getPolybiusKey(polybius: string[][]): string {
    // Make sure that we are dealing with a square
    let height = polybius.length;
    // The array is empty, so return nothing
    if (height === 0) {
        return "";
    }
    // The array isn't square so we also return nothing.
    if (height !== polybius[0].length) {
        return "";
    }
    let horizkey = "";
    let vertkey = "";
    let clockkey = "";
    let counterclockkey = "";
    // get the horizontal and vertical ones
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < height; j++) {
            let c = polybius[i][j];
            if (c === undefined) {
                c = "?";
            }
            horizkey += c;
            c = polybius[j][i];
            if (c === undefined) {
                c = "?";
            }
            vertkey += c;
        }
    }
    let y = 0;
    let x = 0;
    let ylowlimit = -1;
    let yhighlimit = height;
    let xlowlimit = -1;
    let xhighlimit = height;
    let ydelta = 0;
    let lastydelta = -1;
    let xdelta = 1;
    let lastxdelta = -1;
    for (let spot = 0; spot < height * height; spot++) {
        let c = polybius[y][x];
        if (c === undefined) {
            c = "?";
        }
        clockkey += c;
        c = polybius[y][height - 1 - x];
        if (c === undefined) {
            c = "?";
        }
        counterclockkey += c;
        if (xdelta !== 0) {
            x += xdelta;
            if (x <= xlowlimit || x >= xhighlimit) {
                // Time to turn
                if (lastydelta < 0) {
                    ylowlimit++;
                } else {
                    yhighlimit--;
                }
                x -= xdelta;
                lastxdelta = xdelta;
                xdelta = 0;
                ydelta = -lastydelta;
                y += ydelta;
            }
        } else {
            y += ydelta;
            if (y <= ylowlimit || y >= yhighlimit) {
                // time to turn
                if (lastxdelta < 0) {
                    xlowlimit++;
                } else {
                    xhighlimit--;
                }
                y -= ydelta;
                lastydelta = ydelta;
                ydelta = 0;
                xdelta = -lastxdelta;
                x += xdelta;
            }
        }
    }
    // Now we have four strings
    // horizkey
    // vertkey
    //
    //
    let bestkey = extractKey(horizkey);
    let trykey = extractKey(vertkey);
    if (trykey.length < bestkey.length) {
        bestkey = trykey;
    }
    trykey = extractKey(clockkey);
    if (trykey.length < bestkey.length) {
        bestkey = trykey;
    }
    trykey = extractKey(counterclockkey);
    if (trykey.length < bestkey.length) {
        bestkey = trykey;
    }
    return bestkey;
}
