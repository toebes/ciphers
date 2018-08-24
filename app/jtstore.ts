import * as Cookies from "js-cookie";

/**
 * The base class simply says that storage isn't available and silently throws
 * away all data.
 */
export class JTStorage {
    isAvailable(): boolean {
        return false;
    }
    get(entry: string): string {
        return "";
    }
    getJSON(entry: string): any {
        return JSON.parse(this.get(entry));
    }
    set(entry: string, content: any): void {
        return;
    }
    remove(entry: string): void {
        return;
    }
}
/**
 * This verison of JTStorageLocal uses the localStorage routines unless something
 * goes wrong.  At which point it marks that it isn't working, but continues to
 * attempt to access localStorage as long as it is called
 */
class JTStorageLocal extends JTStorage {
    isWorking: boolean = true;
    isAvailable(): boolean {
        return this.isWorking;
    }
    get(entry: string): string {
        let result = "";
        try {
            result = localStorage.getItem(entry);
        } catch {
            alert("Something went wrong with localStorage");
            this.isWorking = false;
        }
        return result;
    }
    set(entry: string, content: any): void {
        // Try to convert the content from JSON if it isn't a string
        // Taken from https://github.com/js-cookie/js-cookie where it was done very well
        try {
            let result = JSON.stringify(content);
            if (/^[\{\[]/.test(result)) {
                content = result;
            }
        } catch (e) {}

        try {
            localStorage.setItem(entry, content);
        } catch {
            alert("Something went wrong with localStorage");
            this.isWorking = false;
        }
        return;
    }
    remove(entry: string): void {
        try {
            localStorage.removeItem(entry);
        } catch {
            alert("Something went wrong with localStorage");
            this.isWorking = false;
        }
        return;
    }
}

class JTStorageCookies extends JTStorage {
    isAvailable(): boolean {
        return true;
    }
    get(entry: string): string {
        return Cookies.get(entry);
    }
    getJSON(entry: string): any {
        return Cookies.getJSON(entry);
    }
    set(entry: string, content: any): void {
        Cookies.set(entry, content);
        return;
    }
    remove(entry: string): void {
        Cookies.remove(entry);
        return;
    }
}
/**
 * This initializes the methods for accessing storage of local data
 * It will first attempt to use localStorage (preferred method)
 * Barring that it will fall back to using Cookies (for IPhone, IPad and Safari)
 * If none of that works, we just have to tell them that it doesn't work on this browser
 */
export function InitStorage(): JTStorage {
    let canUse = false;
    let test = "test";
    // Make sure the browser says we have local storage
    if (typeof Storage !== "undefined") {
        // Ok we will try a simple test (under try/catch) to write/read/remove
        // something from local storage and make sure it really works
        try {
            localStorage.setItem(test, test);
            let compare = localStorage.getItem(test);
            localStorage.removeItem(test);
            // We got here without failing, make sure what we read back was what
            // we expected
            if (compare === test) {
                canUse = true;
            }
        } catch (e) {
            // Something failed, so we can't use local storage
        }
        // It looks good, so give them the local storage class
        if (canUse) {
            return new JTStorageLocal();
        }
    }
    // Try to see if we can get any cookies
    try {
        Cookies.set(test, test);
        let compare = Cookies.get(test);
        Cookies.remove(test);
        // We got here without failing, make sure what we read back was what
        // we expected
        if (compare === test) {
            canUse = true;
        }
    } catch (e) {
        // Something failed, so we can't use cookies
    }
    // It looks good, so give them the cookie class
    if (canUse) {
        return new JTStorageCookies();
    }
    // Nothing worked, so use the default base class which tells you that storage
    // is not available.
    return new JTStorage();
}
