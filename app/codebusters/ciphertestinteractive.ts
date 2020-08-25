import { cloneObject } from '../common/ciphercommon';
import { ITestType, menuMode, toolMode, CipherHandler, IState, IInteractiveTest, ITestQuestionFields } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';
import { RealTimeString, RealTimeArray, ConvergenceDomain, ModelService, RealTimeModel, LogLevel, RealTimeElement, RealTimeObject } from "@convergence/convergence";
import { Convergence } from "@convergence/convergence";
import { CipherInteractiveFactory, CipherFactory } from './cipherfactory';

/**
 * CipherTestInteractive
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 */
export class CipherTestInteractive extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public pageNumber: number = 0;

    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.updateOutput();
    }
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        if (this.state.testID != undefined) {
            $('.testcontent').each((i, elem) => {
                this.displayInteractiveTest($(elem), this.state.testID);
            });
        } else {
            $('.testcontent').each((i, elem) => {
                this.genTestQuestions($(elem));
            });
            this.attachHandlers();
        }
    }
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState('testint');
    }
    public genPage(title: string): JQuery<HTMLElement> {
        let page = $('<div/>', { class: 'page' });
        page.append($('<div/>', { class: 'head' }).text(title));
        if (this.pageNumber % 2 === 1) {
            page.append(
                $('<div/>', { class: 'headright' }).text('School:__________')
            );
        }
        page.append(
            $('<div/>', { class: 'foot' }).text(
                'Page ' + String(this.pageNumber)
            )
        );
        this.pageNumber++;
        return page;
    }
    public getInteractiveDomain(): string {
        return this.getConfigString("domain", "http://toebeshome.myqnapcloud.com:7630/") + "api/realtime/convergence/scienceolympiad";
    }

    public makeInteractive(elem: JQuery<HTMLElement>, state: IState, qnum: number, testtype: ITestType, realTimeObject: RealTimeObject) {
        try {
            let ihandler = CipherInteractiveFactory(state.cipherType, state.curlang);
            ihandler.restore(state);

            let extratext = '';
            let result = $('<div/>', {
                class: 'question ',
            });
            let qtext = $('<div/>', { class: 'qtext' });
            if (qnum === -1) {
                qtext.append(
                    $('<span/>', {
                        class: 'timed',
                    }).text('Timed Question')
                );
                extratext =
                    '  When you have solved it, click the <b>Checked Timed Question</b> button so that the time can be recorded and the solution checked.';
            } else {
                qtext.append(
                    $('<span/>', {
                        class: 'qnum',
                    }).text(String(qnum + 1) + ')')
                );
            }
            qtext.append(
                $('<span/>', {
                    class: 'points',
                }).text(' [' + String(state.points) + ' points] ')
            );
            qtext.append(
                $('<span/>', {
                    class: 'qbody',
                }).html(state.question + extratext)
            );
            result.append(qtext);
            result.append(ihandler.genInteractive(qnum, testtype));
            elem.append(result);
            ihandler.attachInteractiveHandlers(qnum, realTimeObject);
        }
        catch (e) {
            let msg = "Something went wrong generating the Timed Question." +
                " Error =" + e;
            elem.append($("<h1>").text(msg));
        }
    }

    /**
     * GetFactory returns an initialized CipherHandler associated with a question entry
     * @param question Which entry to get the factory for
     * @returns CipherHandler
     */
    public GetFactory(question: number): CipherHandler {
        let state = this.getFileEntry(question);
        let cipherhandler = CipherFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        return cipherhandler;
    }

    /**
     * 
     * @param elem Element 
     */
    public genTestQuestions(elem: JQuery<HTMLElement>): void {
        let testcount = this.getTestCount();
        let errors: string[] = [];
        let SpanishCount = 0;
        elem.empty();
        if (testcount === 0) {
            elem.append($('<h3>').text('No Tests Created Yet'));
        }
        if (this.state.test > testcount) {
            elem.append($('<h3>').text('Test not found'));
        }
        let test = this.getTestEntry(this.state.test);
        let result = $('<div/>');
        elem.append(result);
        $('.testtitle').text(test.title);

        // Gather up the data so that we don't have to go back to the database.
        // This simulates how we will be running with the runtime version
        let interactive: IInteractiveTest = {
            title: test.title,
            useCustomHeader: test.useCustomHeader,
            customHeader: test.customHeader,
            count: 0,
            questions: [],
            testtype: test.testtype,
            hasSpanish: false,
            hasMorse: false,
            qdata: [],
        }
        // Clean up the custom header if it came in blank so we don't have anything undefined in the data structure
        if (!interactive.useCustomHeader) {
            interactive.useCustomHeader = false;
            interactive.customHeader = "";
        }
        if (interactive.testtype === undefined) {
            interactive.testtype = ITestType.cregional;
        }
        let answerdata: ITestQuestionFields[] = [];
        this.runningKeys = undefined;
        if (test.timed === -1) {
            // Division A doesn't have a timed quesiton, so don't print out
            // a message if it isn't there.
            if (interactive.testtype !== ITestType.aregional) {
                result.append(
                    $('<p/>', {
                        class: 'noprint',
                    }).text('No timed question')
                );
            }
            answerdata.push({ answer: [], notes: "" });
        } else {
            let cipherhandler = this.GetFactory(test.timed);
            let qerror = ''
            // Division A doesn't have a timed question, but if one was
            // there, print it out, but generate an error message
            if (interactive.testtype === ITestType.aregional) {
                qerror = 'Not allowed for Division A';
            } else {
                qerror = cipherhandler.CheckAppropriate(interactive.testtype);
            }
            if (qerror !== '') {
                errors.push('Timed Question: ' + qerror);
            }
            // Save the Interactive portion of the test
            interactive.timed = cipherhandler.saveInteractive(interactive.testtype);
            answerdata.push(cipherhandler.getInteractiveTemplate())
            interactive.qdata.push({ qnum: -1, points: interactive.timed.points });
        }
        // Go through all the questions and generate the interactive portion
        for (let qnum = 0; qnum < test.count; qnum++) {
            let cipherhandler = this.GetFactory(test.questions[qnum]);
            // Is this a xenocrypt?  if so we need the Spanish frequency table on the final test
            if (cipherhandler.state.curlang === 'es') {
                SpanishCount++;
                interactive.hasSpanish = true;
            }
            /* Does this cipher involve morse code? */
            if (cipherhandler.usesMorseTable) {
                interactive.hasMorse = true;
            }
            let qerror = cipherhandler.CheckAppropriate(interactive.testtype);
            if (qerror !== '') {
                errors.push('Question ' + String(qnum + 1) + ': ' + qerror);
            }
            // We have the question, so save the interactive data for it
            let idata = cipherhandler.saveInteractive(interactive.testtype);
            answerdata.push(cipherhandler.getInteractiveTemplate());
            interactive.questions.push(idata);
            interactive.qdata.push({ qnum: qnum, points: idata.points });
            interactive.count++;

            // Capture any running keys for the interactive test
            if (cipherhandler.usesRunningKey) {
                // If we haven't gotten any running keys then get the defaults
                if (interactive.runningKeys === undefined) {
                    interactive.runningKeys = this.getRunningKeyStrings();
                }
                // Add this one to the list of running keys used.  Note that we don't
                // have a title, so we have to just make it up.  In theory this shouldn't
                // happen because we would expect that all the running keys were defined before
                // creating the test.
                if (cipherhandler.extraRunningKey !== undefined) {
                    interactive.runningKeys.push({
                        title: 'Unknown',
                        text: cipherhandler.extraRunningKey,
                    });
                }
            }
        }

        // All the interactive data has been captured.  Display any errors that we encountered in the
        // process of generating it.
        if (errors.length === 1) {
            $(".testerrors").append($('<div/>', {
                class: 'callout alert',
            }).text(errors[0]));
        } else if (errors.length > 1) {
            let ul = $("<ul/>");
            for (let msg of errors) {
                ul.append($("<li/>").text(msg));
            }
            $(".testerrors").append($('<div/>', {
                class: 'callout alert',
            }).text("The following errors were found:")
                .append(ul));
        }

        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);

        this.saveModels(elem, interactive, answerdata);
    }
    public postErrorMessage(elem: JQuery<HTMLElement>, message: string) {
        let callout = $('<div/>', {
            class: 'callout alert',
        }).text(message);
        console.log(message);
        elem.append(callout);
    }
    public saveModels(elem: JQuery<HTMLElement>, interactive: IInteractiveTest, answerdata: ITestQuestionFields[]) {
        // Now that we have the model of the test and the model of the answers,
        //  we need to create two models.  
        // The interactive test is what we pull down to create the test
        // the answerdata is what is shared between the test takers
        //
        // Convergence.configureLogging({
        //     root: LogLevel.DEBUG
        // });

        // this.setConfigString("domain", "http://192.168.1.11/");

        // 1. Connect to the domain anonymously.
        Convergence.connectAnonymously(this.getInteractiveDomain())
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.openAutoCreate({
                    collection: "codebusters_tests",
                    // id: "test_data",
                    data: interactive,
                })
                    .then((testmodel: RealTimeModel) => {
                        var testModelID = testmodel.modelId();
                        modelService.openAutoCreate({
                            collection: "codebusters_answers",
                            data: {
                                testid: testModelID,
                                starttime: Date.now(),
                                answers: answerdata
                            }
                        })
                            .then((datamodel: RealTimeModel) => {
                                var dataModelID = datamodel.modelId();
                                let callout = $('<div/>', {
                                    class: 'callout success',
                                }).append($("<a/>", { href: "TestInteractive.html?testID=" + dataModelID, target: "_blank" }).text("Open Interactive test"))
                                elem.append(callout);
                            })
                            .catch((error) => {
                                this.postErrorMessage(elem, "Convergence API could not open data model: " + error);
                            })
                    })
                    .catch((error) => {
                        this.postErrorMessage(elem, "Convergence API could not open test model: " + error);
                    });
            })
            .catch((error) => {
                this.postErrorMessage(elem, "Convergence API could not connect: " + error);
            });
    }

    public loadAndDisplayModels(elem: JQuery<HTMLElement>, testUID: string) {
        // If there are no more domains to try then we just get out of here
        // 1. Connect to the domain anonymously.
        Convergence.connectAnonymously(this.getInteractiveDomain())
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.open(testUID)
                    .then((datamodel: RealTimeModel) => {
                        console.log('opened test model')
                        let testid = datamodel.elementAt("testid").value()
                        modelService.open(testid)
                            .then((testmodel: RealTimeModel) => {
                                console.log("Fully opened: testmodel");
                                this.deferredInteractiveTest(elem, testmodel, datamodel);
                            })
                            .catch((error) => {
                                this.postErrorMessage(elem, "Convergence API could not open data model: " + error);
                            })
                    })
                    .catch((error) => {
                        this.postErrorMessage(elem, "Convergence API could not open test model: " + error);
                    });
            })
            .catch((error) => {
                this.postErrorMessage(elem, "Convergence API could not connect: " + error);
            });
    }

    public displayInteractiveTest(elem: JQuery<HTMLElement>, testUID: string) {
        this.loadAndDisplayModels(elem, testUID);
    }

    public deferredInteractiveTest(elem: JQuery<HTMLElement>, testmodel: RealTimeModel, datamodel: RealTimeModel) {
        let interactive = testmodel.root().value();
        let answerdata = datamodel.root().value();
        let page = this.genPage(interactive.title);
        elem.append(page);
        console.log(interactive);
        /**
         * Output any running keys used
         */
        if (interactive.runningKeys !== undefined) {
            $('#runningkeys').append($('<h2/>').text('Famous Phrases'));
            for (let ent of this.runningKeys) {
                $('#runningkeys').append(
                    $('<div/>', {
                        class: 'runtitle',
                    }).text(ent.title)
                );
                $('#runningkeys').append(
                    $('<div/>', {
                        class: 'runtext',
                    }).text(ent.text)
                );
            }
        }
        /**
         * See if we need to show/hide the Spanish Hints
         */
        if (interactive.hasSpanish) {
            $('.xenocryptfreq').show();
        } else {
            $('.xenocryptfreq').hide();
        }
        /**
         * See if we need to show/hide the Morse Code Table
         */
        if (interactive.hasMorse) {
            $('.morsetable').show();
        } else {
            $('.morsetable').hide();
        }
        /**
         * Lastly we need to print out the score table
         */
        let table = new JTTable({
            class: 'cell shrink testscores',
        });
        let hastimed = false;
        table
            .addHeaderRow()
            .add('Question')
            .add('Value')
            .add('Incorrect letters')
            .add('Deduction')
            .add('Score');
        for (let qitem of interactive.qdata) {
            let qtitle = '';
            if (qitem.qnum === -1) {
                qtitle = 'Timed';
                hastimed = true;
            } else {
                qtitle = String(qitem.qnum);
            }
            let trow = table
                .addBodyRow()
                .add({
                    settings: { class: 't' },
                    content: qtitle,
                })
                .add({
                    settings: { class: 'v' },
                    content: String(qitem.points),
                });
            //             if (this.) {
            //     trow.                .add({
            //         settings: { colspan: 2, class: 'grey' },
            //         content: '',
            //     }).add('');

            // } else {
            trow.add('')
                .add('')
                .add('');
        }
        // }
        // If we had a timed question, we put in the slot for the bonus
        if (hastimed) {
            table
                .addFooterRow()
                .add('Bonus')
                .add('')
                .add({
                    settings: { colspan: 2, class: 'grey' },
                    content: '',
                })
                .add('');
        }
        table
            .addFooterRow()
            .add('Final Score')
            .add({ settings: { colspan: 4 }, content: '' });
        $('#scoretable').append(table.generate());


        // Now go through and generate all the test questions
        if (interactive.timed !== undefined) {
            this.makeInteractive(elem, interactive.timed, -1, interactive.testtype, datamodel.elementAt("answers", 0) as RealTimeObject);
        }
        for (let qnum = 0; qnum < interactive.count; qnum++) {
            this.makeInteractive(elem, interactive.questions[qnum], qnum, interactive.testtype, datamodel.elementAt("answers", qnum+1) as RealTimeObject);
        }


    }
}
