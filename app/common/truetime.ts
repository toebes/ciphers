import { formatTime, timestampFromSeconds } from './ciphercommon';

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
    /** How much the local time is off relative to an external source [timestamp] */
    private timeOffset = 0;
    /** True indicates that we have calculated an offset from an external source */
    private validOffset = false;
    /** Handler for our interval time which keeps checking that time is right */
    private IntervalTimer: number = undefined;
    /** Time when we last called our interval timer [timestamp] */
    private previousTime: number = undefined;
    /** The last time that we synchronized with an external source [timestamp] */
    private lastSyncTime = 0;
    /** How often we need to check that the local clock hasn't been changed underneath us [seconds] */
    private validationInterval = 1.0;
    /** How often we need to synchronize with an external source [seconds] */
    private syncInterval = 30.0;
    /** How much we will allow time to drift before being concerned [seconds] */
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
     * @param interval [seconds] New interval. Must be either blank or positive number <= 60 (one minute)
     *                 any invalid value defaults it to half a minute.
     */
    public setValidationInterval(interval?: number): void {
        // Make sure that they don't give us an invalid or very long range.  The choice
        // of making it be within a minute is somewhat arbitrary.
        if (interval === undefined || interval <= 0.0 || interval > 60.0) {
            interval = 30.0;
        }
        // Turn off timing before setting it so that it doesn't complain about
        // a drift interval when the timer goes off.
        this.stopTiming();
        this.validationInterval = interval;
        this.startTiming();
    }
    /**
     * Set the notify callback function.
     * @param notifyCallback Callback function to notify on any changes (undefined to hide notifications)
     */
    public setNotify(notifyCallback?: ChangeNotifyCallback): void {
        this.notifyFunc = notifyCallback;
    }
    /**
     * Notify of a problem event where time has been changed inappropriately or the clock has drifted too far
     * @param msg Message string to pass to interested parties
     */
    public notify(msg: string): void {
        // Only call their notify function if it actally is set.
        if (this.notifyFunc !== undefined) {
            this.notifyFunc(msg);
        }
        console.log('**TrueTime Event: ' + msg);
    }
    public getDelta(): number {
        return this.timeOffset;
    }
    /**
     * Get an adjusted UTC time.
     * @returns Number of miliseconds since the UTC epoch start.
     */
    public UTCNow(): number {
        return Date.now() + this.timeOffset;
        // let curtime = Date.now();
        // if (this.validOffset) {
        //     curtime += this.timeOffset;
        // }
        // return curtime;
    }
    /**
     * Internal timer driven function that checks to see if someone has adjusted the clock
     */
    private validateInterval(): void {
        const curtime = this.UTCNow();
        if (this.previousTime != undefined) {
            // This is our second or subsequent time to be called, check to see if we have a delta that we
            // should be concerned about.
            const delta =
                curtime - (this.previousTime + timestampFromSeconds(this.validationInterval));
            // See if we drifted more than 2 seconds beyond the interval.  Somewhat arbitrary a number but
            // in general it should be as small as possible.
            if (Math.abs(delta) > timestampFromSeconds(2.0)) {
                const msg =
                    'Time has been adjusted by ' +
                    String(delta - this.validationInterval) +
                    ' seconds.';
                // We know we have to adjust our offset.
                this.updateOffset(this.timeOffset + delta);
                this.notify(msg);
                // And since it adjusted, let's revalidate against a trusted source
                this.syncTime();
            } else {
                // So we can track drift, we assume that time advanced by the interval amount
                // This ensures that we catch a system where the clock is running at half speed somehow
                this.previousTime += timestampFromSeconds(this.validationInterval);
                // See if it is time for us to revalidate against a trusted source.
                if (curtime - this.lastSyncTime > timestampFromSeconds(this.syncInterval)) {
                    this.syncTime();
                }
            }
        } else {
            // First time through so record the starting time
            this.previousTime = curtime;
        }
    }
    /**
     * startTiming turns on the interval validation timer
     */
    public startTiming(): void {
        // We don't want to start the timer if it is already running.
        this.stopTiming();
        this.syncTime();
        // Since the timer is just getting started, we haven't gotten the time previously
        this.previousTime = undefined;
        this.IntervalTimer = window.setInterval(() => {
            this.validateInterval();
        }, timestampFromSeconds(this.validationInterval));
    }
    /**
     * stopTiming turns off our timer.
     */
    public stopTiming(): void {
        if (this.IntervalTimer !== undefined) {
            clearInterval(this.IntervalTimer);
            this.IntervalTimer = undefined;
        }
    }
    /**
     * Update the time offset value
     * @param offset New time offset
     */
    public updateOffset(offset: number): void {
        this.timeOffset = offset;
        this.validOffset = true;
        this.previousTime = undefined;
    }
    /**
     * syncTime checks to see how far off we are from the server time
     */
    public syncTime(): void {
        $.ajaxSetup({ cache: false });
        $.getJSON('https://toebes.com/codebusters/time.php')
            .done((data) => {
                // We received a response with the current time.  Note that it may have taken
                // some time for it to get to us, but on average we can assume that the delay is
                // mostly the same from call to call and unlikely to be more than a couple hundred
                // milliseconds.
                const curtime = Date.now();
                // Figure out how far off the time the server tolds us it is from the current time (all is in UTC)
                const delta = data.microtime - curtime;
                if (!this.validOffset) {
                    // We've never set the offset, so update it now
                    this.updateOffset(delta);
                    if (delta > timestampFromSeconds(this.maxDrift)) {
                        // We are out of sync initially, so let them know
                        const msg =
                            'Time was off by more than ' +
                            String(this.maxDrift) +
                            ' seconds.  Adjusting to ' +
                            String(timestampFromSeconds(delta));
                        this.notifyFunc(msg);
                    }
                } else {
                    // We previously had an offset, see how far off we are now relative to previously
                    const change = Math.abs(delta - this.timeOffset);
                    // See if we have drifted more than we want
                    if (change > timestampFromSeconds(this.maxDrift)) {
                        // We are out of our drift tolerance, then we will have to update it.
                        this.updateOffset(delta);
                        // And let someone know that it has
                        const msg =
                            'Time has drifted by more than ' +
                            String(this.maxDrift) +
                            ' seconds.  Adjusting to ' +
                            String(timestampFromSeconds(delta));
                        this.notifyFunc(msg);
                    }
                }
                // console.log("**Time Result: Delta=", delta + " curtime=" + curtime + " Date:" + Date()); console.log(data);
                // Track when we last did this so that we don't ask too often
                this.lastSyncTime = this.UTCNow();
            })
            .fail((error) => {
                console.log('**TIME FAIL:' + error);
            });
    }
}
