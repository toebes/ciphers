export interface StringMap {
    [index: string]: string
}

export interface BoolMap {
    [index: string]: boolean
}

export interface NumberMap {
    [index: string]: number
}

/**
 * Makes a deep copy of any object
 */
export function cloneObject(source: object): object {
    let clone = {}
    if (source !== null) {
        for (let elem of Object.keys(source)) {
            if (source[elem] != null && typeof (source[elem]) === "object") {
                clone[elem] = cloneObject(source[elem]);
            } else {
                clone[elem] = source[elem]
            }
        }
    }
    return clone;
}
