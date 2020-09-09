import { not } from "mathjs";

/**
 * ChangeNotifyCallback is the callback function that gets invoked when the TrueTime object discovers that time has somehow
 * been tampered with or has drifted by more than an acceptable amount.
 */
export interface ChangeNotifyCallback {
    (message: string): void;
}

/**
 * TrueTime attempts to keep an accurate time independent of what the user may have set on their browser.
 * The goal is to insulate from any problems with incorrect clock time or users changing their local clock.
 */
export class TrueTime {
    /** How much the local time is off relative to an external source */
    private timeOffset = 0;
    /** True indicates that we have calculated an offset from an external source */
    private validOffset = false;
    /** Handler for our interval time which keeps checking that time is right */
    private IntervalTimer: NodeJS.Timeout = undefined;
    /** Time when we last called our interval timer */
    private previousTime: number = undefined;
    /** The last time that we synchronized with an external source */
    private lastSyncTime = 0;
    /** How often we need to check that the local clock hasn't been changed underneath us */
    private validationInterval = 1.0;
    /** How often we need to synchronize with an external source */
    private syncInterval = 30.0;
    /** How much we will allow time to drift before being concerned */
    private maxDrift = 5.0;
    /** Callback function to notify on any changed (undefined for no notification) */
    private notifyFunc: ChangeNotifyCallback = undefined;

    /**
     * Constructure for initializing the object
     * @param notifyCallback Callback function to notify on any changes (undefined to hide notifications)
     */
    constructor(notifyCallback?: ChangeNotifyCallback) {
        this.setNotify(notifyCallback);
        this.startTiming();
    }
    /**
     * Change the validation interval for how frequently we check that the clock has changed or
     * time has drifted.
     * @param interval New interval.  Must be either blank or positive number <= 60 (one minunte)
     */
    public setValidationInterval(interval?: number) {
        if (interval === undefined || interval <= 0 || interval > 60) {
            interval = 30.0;
        }
        this.stopTiming();
        this.validationInterval = interval;
        this.startTiming();
    }
    /**
     * Set the notify callback function.  
     * @param notifyCallback Callback function to notify on any changes (undefined to hide notifications)
     */
    public setNotify(notifyCallback?: ChangeNotifyCallback) {
        this.notifyFunc = notifyCallback;
    }
    /**
     * Notify of a problem event where time has been changed inappropriately or the clock has drifted too far
     * @param msg Message string to pass to interested parties
     */
    public notify(msg: string) {
        if (this.notifyFunc !== undefined) {
            this.notifyFunc(msg);
        }
        console.log('**TrueTime Event: ' + msg);
    }
    /**
     * Get an adjusted UTC time.
     * @returns Number of seconds since the UTC epoch start.
     */
    public UTCNow(): number {
        let curtime = Date.now() / 1000.0;
        if (this.validOffset) {
            curtime += this.timeOffset;
        }
        return curtime;
    }
    /**
     * Get an adjusted UTC time.
     * @returns Number of miliseconds since the UTC epoch start.
     */
    public UTCMSNow(): number {
        let curtime = Date.now();
        if (this.validOffset) {
            curtime += this.timeOffset * 1000.0;
        }
        return curtime;
    }
    /**
     * Internal timer driven function that 
     */
    private validateInterval() {
        let curtime = this.UTCNow();
        if (this.previousTime != undefined) {
            let delta = Math.abs(curtime - this.previousTime);
            // See if we drifted 
            if (delta > (this.validationInterval + 2)) {
                let msg = "Time has been adjusted by " + String(delta - this.validationInterval) + " seconds.";
                this.validOffset = true;
                this.timeOffset += (curtime - 1 - this.previousTime);
                this.notify(msg);
                this.syncTime();
                // See if it is time for us to revalidate against a trusted source.
            } else if ((curtime - this.lastSyncTime) > this.syncInterval) {
                this.syncTime();
            }
        }
        this.previousTime = curtime;
    }
    /**
     * startTiming turns on the interval validation timer
     */
    public startTiming() {
        this.stopTiming();
        this.previousTime = undefined;
        this.IntervalTimer = setInterval(() => { this.validateInterval() }, this.validationInterval * 1000);
    }
    /**
     * stopTiming turns off our timer.
     */
    public stopTiming() {
        if (this.IntervalTimer !== undefined) {
            clearInterval(this.IntervalTimer);
            this.IntervalTimer = undefined;
        }
    }
    /**
     * Update the time offset value
     * @param offset New time offset
     */
    public updateOffset(offset: number) {
        this.timeOffset = offset;
        this.validOffset = true;
        this.previousTime = undefined;
    }
    /**
     * syncTime checks to see 
     */
    public syncTime() {
        $.getJSON("https://toebes.com/codebusters/time.php")
            .done(data => {
                let curtime = Date.now() / 1000.0;
                let delta = curtime - data.microtime;
                if (!this.validOffset) {
                    this.updateOffset(delta);
                } else {
                    let change = Math.abs(delta - this.timeOffset);
                    if (change > this.maxDrift) {
                        this.updateOffset(delta);
                        let msg = "Time has drifted by more than " + this.maxDrift + " seconds.  Adjusting to " + delta;
                        this.notifyFunc(msg);
                    }
                }
                console.log("**Time Result: Delta=", delta + " curtime=" + curtime + " Date:" + Date()); console.log(data);
                this.lastSyncTime = this.UTCNow();
            })
            .fail(error => { console.log("**TIME FAIL:" + error); });
    }
}