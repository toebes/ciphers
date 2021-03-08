import { cloneObject } from '../common/ciphercommon';
import { IState, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { IRealtimeMetaData, ITestState, SourceModel } from './ciphertest';
import { CipherTestManage } from './ciphertestmanage';
import { ConvergenceDomain, ModelService, RealTimeModel } from '@convergence/convergence';
import { JTFDialog } from '../common/jtfdialog';

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherTestPublished extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestManageState('published');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });

        if (this.confirmedLoggedIn(' in order to see tests assigned to you.', result)) {
            const table = new JTTable({ class: 'cell shrink publist' });
            const row = table.addHeaderRow();
            row.add('Action')
                .add('Title')
                .add('Questions')
                .add('Scheduled');
            result.append(table.generate());

            this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                this.findAllTests(domain);
            });
        }
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findAllTests(domain: ConvergenceDomain): void {
        const modelService = domain.models();
        this.getRealtimeSourceMetadata()
            .then((metadataset) => {
                metadataset.forEach((metadata) => {
                    // For Debugging you can use just this metadata for a call to addPublishedEntry
                    //
                    // let metadata: IRealtimeMetaData = {
                    //     testid: "bde4aafd-9138-4547-be36-0901bff65552",
                    //     sourceid: "123456",
                    //     answerid: "0",
                    //     id: "12345",
                    //     title: "Sample Title",
                    //     type: 'sourcemodel',
                    //     questions: 42,
                    //     dateCreated: 0,
                    //     createdBy: "john@toebes.com"
                    // }

                    this.addPublishedEntry(modelService, metadata);
                })
                // Kick off a request to figure out how many tests are scheduled
                this.calculateScheduledTests(modelService);

                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Unable to query source test list: ' + error);
            });
    }
    /**
     * Add/replace a test entry to the table of all tests along with the buttons to interact with the test.
     * @param modelService Domain Model service object for making requests
     * @param metadata metadata for the source model entry
     */
    public addPublishedEntry(modelService: Convergence.ModelService, metadata: IRealtimeMetaData): void {
        const tr = $('<tr/>', {
            'data-source': metadata.id,
            'data-test': metadata.testid,
            'data-answer': metadata.answerid,
        });
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        buttons.append(
            $('<a/>', {
                'data-source': metadata.id,
                type: 'button',
                class: 'pubedit button',
            }).text('Edit')
        );
        buttons.append(
            $('<a/>', {
                'data-source': metadata.id,
                type: 'button',
                class: 'pubdel alert button',
            }).text('Delete')
        );
        buttons.append(
            $('<a/>', {
                'data-source': metadata.id,
                type: 'button',
                class: 'pubpermit button',
            }).text('Permissions')
        );
        buttons.append(
            $('<a/>', {
                'data-source': metadata.id,
                type: 'button',
                class: 'pubsched button',
            }).text('Schedule Test')
        );
        buttons.append(
            $('<a/>', {
                'data-source': metadata.id,
                type: 'button',
                class: 'pubresults button',
            }).text('View Results')
        );
        tr.append($('<td/>').append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($('<td/>').text(metadata.title))
            .append($('<td/>').text(String(metadata.questions)))
            .append(
                $('<td/>').append(
                    $('<div/>', { class: 'sched', 'data-sched': 1, 'data-source': metadata.testid }).text(
                        'Calculating...'
                    )
                )
            );

        const curtr = $('tr[data-source="' + metadata.id + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $('.publist').append(tr);
        }
    }
    /**
     * Determine how many tests are scheduled for a given test template and update the div holding that number.
     * @param modelService Domain Model service object for making requests
     * @param testmodelid ID of the test model to count scheduled tests for
     */
    public calculateScheduledTests(modelService: Convergence.ModelService): void {
        let scheduled = $('div[data-sched]')
        if (scheduled.length > 0) {
            let entry = scheduled[0]
            let modelId = entry.getAttribute('data-source')
            entry.removeAttribute('data-sched')
            modelService
                .query("SELECT testid FROM codebusters_answers where testid='" + modelId + "'")
                .then((results) => {
                    let total = results.data.length;
                    let fieldtext = String(total);
                    if (total === 0) {
                        fieldtext = 'None Scheduled';
                    }
                    // Now we just need to replace the value
                    $(entry).text(fieldtext);
                    setTimeout(() => { this.calculateScheduledTests(modelService) }, 1);
                })
                .catch((error) => {
                    this.reportFailure('Convergence API query problem: ' + error);
                    setTimeout(() => { this.calculateScheduledTests(modelService) }, 1);
                });
        }
    }
    /**
     * Download the source from a published test and edit it locally.
     * @param sourcemodelid published ID of test
     */
    public downloadPublishedTest(sourcemodelid: string): void {
        this.getRealtimeSource(sourcemodelid)
            .then((sourceModel: SourceModel) => {
                this.processTestXML(sourceModel.source);
            })
            .catch((error) => {
                this.reportFailure(
                    'Convergence API could not open model ' + sourcemodelid + ' Error:' + error
                );
            });
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     */
    private createDeletePublishedDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).text(
            'This will delete the published test from the server! ' +
            'This operation can not be undone. ' +
            'Please make sure you have saved a copy in case you need it. ' +
            '  Are you sure you want to do this?'
        );
        const DeletePublishedDlg = JTFDialog(
            'delpubdlg',
            'Delete Published Test',
            dlgContents,
            'okdel',
            'Yes, Delete it!'
        );
        return DeletePublishedDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createDeletePublishedDlg());
        return result;
    }
    /**
     * Remove a test from the server along with all the scheduled tests that are associated with it
     * @param sourcemodelid ID of the source model
     * @param testModelID ID of the test model
     */
    public deleteTestFromServer(sourcemodelid: string, testmodelid: string, answertemplateid: string): void {
        // by calling modelService.remove()
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            this.doDeleteTestFromServer(domain, sourcemodelid, testmodelid, answertemplateid);
        });
    }
    /**
     * deleteTestModels deletes the answertemplate, testmodel and source model associated with a test
     * @param sourcemodelid 
     * @param testmodelid 
     * @param answertemplateid 
     */
    public deleteTestModels(sourcemodelid: string, testmodelid: string, answertemplateid: string): void {
        if (answertemplateid !== undefined) {
            this.deleteRealitimeElement('answertemplate', answertemplateid)
                .then(() => {
                    setTimeout(() => { this.deleteTestModels(sourcemodelid, testmodelid, undefined) }, 1);
                }).catch((error) => {
                    this.reportFailure('Unable to remove ' + answertemplateid + ' Error code:' + error)
                    setTimeout(() => { this.deleteTestModels(sourcemodelid, testmodelid, undefined) }, 1);
                })
        } else if (testmodelid !== undefined) {
            this.deleteRealitimeElement('testmodel', testmodelid)
                .then(() => {
                    setTimeout(() => { this.deleteTestModels(sourcemodelid, undefined, undefined) }, 1);
                }).catch((error) => {
                    this.reportFailure('Unable to remove ' + testmodelid + ' Error code:' + error)
                    setTimeout(() => { this.deleteTestModels(sourcemodelid, undefined, undefined) }, 1);
                })
        } else if (sourcemodelid !== undefined) {
            this.deleteRealitimeElement('testmodel', sourcemodelid)
                .then(() => {
                    // And update the table to remove the entry
                    $('tr[data-source="' + sourcemodelid + '"]').remove();
                }).catch((error) => {
                    this.reportFailure('Unable to remove ' + sourcemodelid + ' Error code:' + error)
                })
        }
    }
    /**
     * deleteAnswerModels removes all answer models associated with a test and then invokes the process to delete the main test models
     * @param modelService Domain Model service object for making requests
     * @param answerModels 
     * @param sourcemodelid 
     * @param testmodelid 
     * @param answertemplateid 
     */
    public deleteAnswerModels(modelService: ModelService, answerModels: string[], sourcemodelid: string, testmodelid: string, answertemplateid: string): void {
        // one at a time we delete the answer models
        let toremove = answerModels.pop()
        if (toremove !== undefined) {
            modelService.remove(toremove)
                .then(() => {
                    setTimeout(() => { this.deleteAnswerModels(modelService, answerModels, sourcemodelid, testmodelid, answertemplateid) }, 1);
                }).catch((error) => {
                    this.reportFailure('Unable to remove ' + toremove + ' Error code:' + error)
                    setTimeout(() => { this.deleteAnswerModels(modelService, answerModels, sourcemodelid, testmodelid, answertemplateid) }, 1);
                })
            // No more answer models, so see if we still have a test model
        } else {
            this.deleteTestModels(sourcemodelid, testmodelid, answertemplateid)
        }
    }
    /**
     * Perform the real work of deleting the models from the server.
     * Search for all answer templates which refer to the test template and then delete the source and test templates
     *
     * @param domain
     * @param sourcemodelid
     * @param testModelID ID of the test model
     */
    public doDeleteTestFromServer(domain: ConvergenceDomain, sourcemodelid: string, testmodelid: string, answertemplateid: string): void {
        const modelService = domain.models();
        // Our query should get all of the answer templates which reference the test
        modelService
            .query("SELECT testid FROM codebusters_answers where testid='" + testmodelid + "'")
            .then((results) => {
                let answerModels: string[] = []
                results.data.forEach((result) => {
                    answerModels.push(result.modelId)
                });
                this.deleteAnswerModels(modelService, answerModels, sourcemodelid, testmodelid, answertemplateid);
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not connect: ' + error);
            });
    }
    /**
     * See if the user wants to actually delete a test (after warnign them) and if so, request the deletion.
     * @param sourcemodelid published ID of test
     */
    public deletePublishedTest(sourcemodelid: string): void {
        // First we need to get the testmodel and the answer model because we want to delete them too
        const tr = $('tr[data-source="' + sourcemodelid + '"]');
        const testmodelid = tr.attr('data-test');
        const answertemplateid = tr.attr('data-answer');
        if (testmodelid === '') {
            alert('Unable to identify the test model');
        } else if (answertemplateid === '') {
            alert('Unable to identify the answer template');
        } else {
            $('#okdel')
                .off('click')
                .on('click', () => {
                    this.deleteTestFromServer(sourcemodelid, testmodelid, answertemplateid);
                    $('#delpubdlg').foundation('close');
                    tr.remove();
                });
            $('#okdel').removeAttr('disabled');
            $('#delpubdlg').foundation('open');
        }
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.pubedit')
            .off('click')
            .on('click', (e) => {
                this.downloadPublishedTest($(e.target).attr('data-source'));
            });
        $('.pubdel')
            .off('click')
            .on('click', (e) => {
                this.deletePublishedTest($(e.target).attr('data-source'));
            });
        $('.pubpermit')
            .off('click')
            .on('click', (e) => {
                this.gotoPublishedTestPermissions($(e.target).attr('data-source'));
            });
        $('.pubsched')
            .off('click')
            .on('click', (e) => {
                this.gotoPublishedSchedule($(e.target).attr('data-source'));
            });
        $('.pubresults')
            .off('click')
            .on('click', (e) => {
                this.gotoPublishedResults($(e.target).attr('data-source'));
            });
    }
}
