import { ConvergenceDomain } from '@convergence/convergence';
import { timestampFromMinutes, makeCallout } from '../common/ciphercommon';
import { CipherTakeTest } from './ciphertaketest';
import { IAnswerTemplate } from './ciphertest';


/* The number of minutes after a test that they can still submit */
const AttachTimeLimit = 1000;
/**
 * CipherTestAttach
 *  Allows attaching an image to a previously taken test.
 */
export class CipherTestAttach extends CipherTakeTest {
    /**
     * Generates a list of all the tests on the server in a table.
     * @returns HTML content of list of tests
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });

        if (this.confirmedLoggedIn(' in order to see tests assigned to you.', result)) {
            const top = $("<div/>", { class: 'publist' });
            result.append(top);
            this.DisplayDomainTitle(result);
            this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                this.findAllTests(domain);
            });
        } else {
            result.append($("<h2/>").text("Attach images here:"))
            // result.append($("<input/>", { type: "file", accept: "image/*", capture: "camera" }));
            result.append($("<input/>", { type: "file", accept: "image/*", "multiple": true }));
        }
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    public findAllTests(domain: ConvergenceDomain): void {
        const modelService = domain.models();
        let testid = this.state.testID;
        if (testid === undefined || testid === null) {
            testid = "";
        }
        // We know that we are logged in because the toplevel routine confirms it, but
        // just incase we still need a default for the userid
        const userid = this.getConfigString('userid', 'NOBODY');
        modelService
            .query('SELECT testid,starttime,endtime,assigned, teamname,teamtype FROM codebusters_answers')  // This stays with Convergence for the answer models
            .then((results) => {
                let count = 0;
                results.data.forEach((result) => {
                    const answertemplate = result.data as IAnswerTemplate;
                    // Check to see if they are permitted
                    let isAssigned = false;
                    for (const asn of answertemplate.assigned) {
                        if (asn.userid === userid) {
                            isAssigned = true;
                            break;
                        }
                    }
                    if (this.checkEntry(result.modelId, answertemplate, isAssigned, testid)) {
                        count++;
                    }
                });
                if (count === 0) {
                    if (testid === "") {
                        const callout = makeCallout("There are currently no tests available for you to attach images to", 'primary')
                        $('.testlist').append(callout);
                    } else {
                        const callout = makeCallout("That test is not available for you to attach images to", 'alert')
                        $('.testlist').append(callout);
                    }
                }
                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not connect: ' + error);
            });
    }
    /**
 * Add/replace a test entry to the table of all tests along with the buttons to interact with the test.
 * @param answerModelID ID of the answer model
 * @param answertemplate Contents of answer
 */
    public checkEntry(answerModelID: string, answertemplate: IAnswerTemplate, isAssigned: boolean, testid: string): boolean {
        const result = $(".publist");
        const now = this.truetime.UTCNow();

        // We can only upload images for a test that already started and the end time 
        // is less than 10 minutes ago (configured as AttachTimeLimit above)
        if (isAssigned &&
            answertemplate.starttime < now &&
            answertemplate.endtime + timestampFromMinutes(AttachTimeLimit) >= now) {
            if (testid === "") {
                const testmodelid = answertemplate.testid;
                const starttime = " started " + new Date(answertemplate.starttime).toLocaleString();
                const endtime = new Date(answertemplate.endtime).toLocaleString();

                let endtitle = " ended at ";
                if (answertemplate.endtime > now) {
                    " will end at ";
                }
                result.append($("<hr/>"));
                const line = $('<div/>', { 'data-answer': answerModelID });
                const testtitle = $('<span/>').text('..Loading...');
                this.fillTitle(testtitle, testmodelid);
                line.append($('<span/>').append(testtitle))
                    .append($('<span/>').text(starttime +
                        endtitle + endtime + " " +
                        answertemplate.teamname + " " + answertemplate.teamtype));
                result.append(line);

                this.displayUploadQR(result, answerModelID, "");
                return true;
            } else if (testid === answerModelID) {
                // This is the one that they asked for.. Put up the UI for attaching
                result.append($("<h2/>").text("Attach images here:"))
                result.append($("<input/>", { type: "file", accept: "image/*", capture: "camera" }));
                return true;
            }
            // This is a test that is possible, but they are asking for a different test
            return false;
        }
        // This test is not one that they can upload for
        // If they didn't request a specific test, we can just ignore it
        // Also if they requested a specific, test, but it wasn't this one, we can also ignore it
        // Note that not requesting one, testid will be "" and won't match the modelid
        if (testid !== answerModelID) {
            return false;
        }

        // Ok this is a problem, they want to update this test, but
        // 1) They aren't assigned to take the test
        // 2) They are too early to attach (since the test hasn't started)
        // 3) They are too late to attach
        if (!isAssigned) {
            result.append(makeCallout("You aren't assigned to take that this test", 'alert'));
        } else if (answertemplate.starttime >= now) {
            result.append(makeCallout("This test hasn't started yet", 'alert'));
        } else {
            const minutesago = Math.round((now - answertemplate.endtime) / timestampFromMinutes(1));
            const endtime = new Date(answertemplate.endtime).toLocaleString();

            let message = "It is too late to attach images to this test. " +
                "It ended " + minutesago + " minutes ago at " + endtime;
            result.append(makeCallout(message, 'alert'));
        }
        return true;
    }

}
