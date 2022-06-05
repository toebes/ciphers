import { cloneObject, setCharAt } from '../common/ciphercommon';
import { IState, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherSolver } from './ciphersolver';

export class CipherHomophonicSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    /** Converted value of the cipher string */
    public HomophonicVals: number[] = [];
    public defaultstate: IState = {
        cipherType: ICipherType.Homophonic,
        replacement: {},
        cipherString: '',
        findString: '',
        keyword: 'AAAA',
    };
    public init(lang: string): void {
        super.init(lang);
        let charset = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
        this.setCharset(charset);
        this.setSourceCharset(charset);
    }
    public state: IState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        { title: 'Reset', color: 'warning', id: 'reset' },
    ];
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setCipherString(this.state.cipherString);
        this.setKeyword(this.state.keyword);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        JTRadioButtonSet('ciphertype', this.state.cipherType);
        $('#keyword').val(this.state.keyword);
        $('#encoded').val(this.state.cipherString);
        $('#find').val(this.state.findString);
        this.showQuestion();
        this.load();
        this.findPossible(this.state.findString);
    }
    /**
     * Resetting any solving matches made
     */
    public reset(): void {
        this.init(this.state.curlang);
        this.state.locked = {};
        super.reset();
    }
    /**
     * Add any solution text to the problem
     */
    public saveSolution(): void {
        this.state.solved = true;
        this.state.solution =
            this.state.keyword.toUpperCase() + '. ' + this.getMappedString();
    }
    /**
     * Sets the keyword (state.keyword)
     * @param keyword New keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword(keyword: string): boolean {
        let changed = false;
        if (this.state.keyword !== keyword) {
            this.state.keyword = keyword;
            changed = true;
        }
        return changed;
    }
    /**
     * Tweaks the keyword by increasing/decreasing the value of a letter.
     * This effectively rotates the cipher.
     * @param charspot Position in the keyword to adjust
     * @param offset How much to advance/decrement the letter
     */
    public adjustKeyword(charspot: number, offset: number): void {
        let spot = charspot;
        if (isNaN(spot)) {
            spot = 0;
        }
        let newc = this.state.keyword.substr(spot, 1);
        let charset = this.getCharset();
        let idx = charset.indexOf(newc);
        if (idx !== -1) {
            idx = (idx + offset + charset.length) % charset.length;
            newc = charset.substr(idx, 1);
            let keyword = setCharAt(this.state.keyword, spot, newc);
            this.setKeyword(keyword);
        }
    }
    /**
     * Updates the stored state cipher string.  We also calculate the frequency
     * and build an easy map of the numbers
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let newstr = cipherString.replace(/Ø/g, '0');
        let changed = super.setCipherString(newstr);
        let str = this.cleanString(this.state.cipherString);
        this.HomophonicVals = [];
        this.freq = {};
        // Go through the string and parse it generating the frequency of each
        // group of numbers
        let curval = '';
        for (let c of str + ' ') {
            if (c === ' ') {
                if (curval !== '') {
                    let val = Number(curval);
                    this.HomophonicVals.push(val);
                    if (this.freq[val] === undefined) {
                        this.freq[val] = 1;
                    } else {
                        this.freq[val]++;
                    }
                    curval = '';
                }
            } else if (c >= '0' && c <= '9') {
                curval += c;
            }
        }
        return changed;
    }
    public getMappedString(): string {
        let charset = this.getCharset();
        let mapset = '';
        let keyword = this.state.keyword.toUpperCase() + 'AAAA';
        for (let c of keyword.substr(0, 4)) {
            let idx = charset.indexOf(c);
            if (idx < 0) {
                idx = 0;
            }
            mapset += charset.substr(idx) + charset.substr(0, idx);
        }
        // And because the last character is actually the first, we have to fix
        // the string
        mapset = mapset.substr(mapset.length - 1) + mapset;
        let result = '';
        for (let i of this.HomophonicVals) {
            result += mapset.substring(i, i + 1);
        }
        return result;
    }
    public genAnalysis(str: string): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Build the solving GUI
     * We want to have four rows of
     */
    public build(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'clearfix' });
        let str = this.cleanString(this.state.cipherString);
        if (str === '') {
            return $('<div/>', { class: 'callout warning' }).text(
                'Enter a cipher to get started'
            );
        }
        let charset = this.getCharset();
        let cols = charset.length;
        let table = new JTTable({ class: 'tfreq shrink cell' });
        let headrow = table.addHeaderRow();
        let keyword = this.state.keyword.toUpperCase();
        headrow.add('');
        for (let c of charset) {
            if (c === 'I') {
                headrow.add('I/J');
            } else {
                headrow.add(c);
            }
        }
        for (let row = 0; row < 4; row++) {
            let valrow = table.addBodyRow([
                {
                    celltype: 'th',
                    settings: { rowspan: 2 },
                    content: $('<button/>', {
                        href: '#',
                        class: 'ls',
                        'data-row': row,
                    }).html('&#8647;'),
                },
            ]);
            // Figure out our offset
            let offset = charset.indexOf(keyword.substr(row, 1));
            if (offset < 0) {
                offset = 0;
            }
            offset = -offset;
            let freqrow = table.addBodyRow();
            for (let col = 0; col < cols; col++) {
                let val =
                    (((offset + col + cols) % cols) + cols * row + 1) %
                    (cols * 4);
                let freq = this.freq[val];
                let dispval = '00' + String(val);
                valrow.add(String(dispval.substr(dispval.length - 2)));
                if (freq === undefined) {
                    freqrow.add('');
                } else {
                    freqrow.add(String(freq));
                }
            }
            valrow.add({
                celltype: 'th',
                settings: { rowspan: 2 },
                content: $('<button/>', {
                    href: '#',
                    class: 'rs',
                    'data-row': row,
                }).html('&#8649;'),
            });
        }
        result.append(table.generate());
        result.append(
            $('<div/>', { class: 'ans' }).text(this.getMappedString())
        );
        // this.state.solution = solution;
        // this.state.solved = true;
        return result;
    }
    /**
     * Generates the section above the command buttons
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');

        result.append(
            JTFLabeledInput(
                'Cipher Text',
                'textarea',
                'encoded',
                this.state.cipherString,
                'small-12 medium-12 large-12'
            )
        );
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append($('<div>', { class: 'err' }));
        result.append(
            JTFLabeledInput(
                'Keyword',
                'text',
                'keyword',
                this.state.keyword,
                'small-12 medium-12 large-12'
            )
        );
        result.append(this.genFindCommands());
        return result;
    }
    /*
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'clearfix' });
        return result;
    }
    /**
     * This looks for a Homophonic encoded string in the input pattern.  It relies on:
     *   this.cipherWidth to be the width of each encoded character
     * @param str String to search for
     */
    public findPossible(str: string): void {
        this.state.findString = str;
        if (str === '') {
            $('.findres').empty();
            return;
        }
        let maxcols = 5;
        let tdcount = 0;
        let table = new JTTable({ class: 'found' });
        let row = table.addHeaderRow();
        for (let i = 0; i < maxcols; i++) {
            row.add('Pos').add('Key');
        }
        row = table.addBodyRow();
        let keyset: number[] = [];
        let charset = this.getCharset();
        let charlen = charset.length;
        for (let v of this.HomophonicVals) {
            v = Math.floor(((v + charlen * 4 - 1) % (charlen * 4)) / charlen);
            keyset.push(v);
        }
        // Get a string that we can work with
        let tofind = this.minimizeString(this.state.findString);
        let findlen = tofind.length;
        // Walk through all of the entries looking for matches
        for (let pos = 0; pos < this.HomophonicVals.length - findlen; pos++) {
            let keyvals = [-1, -1, -1, -1];
            let matched = true;
            for (let i = 0; i < findlen; i++) {
                let set = keyset[pos + i];
                let c = tofind.substring(i, i + 1);
                if (keyvals[set] === -1) {
                    // this.HomophonicVals[pos+i] is the character we are mapping
                    // tofind.substr(pos,1) is the character we expect to map it to
                    let idx = charset.indexOf(c);
                    // 'T'  - idx = 18
                    // set = 0
                    // this.HomophonivVals[pos+i] = 23
                    // I want to get a W = 21
                    //  idx - 25
                    keyvals[set] =
                        (charlen + 1 + idx - this.HomophonicVals[pos + i]) %
                        charlen;
                }
                // keyvals[set] = 21
                // this.HomophonivVals[pos+i] = 23
                let matchidx =
                    (keyvals[set] + this.HomophonicVals[pos + i] - 1) % charlen;
                if (charset.substr(matchidx, 1) !== c) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                let keyword = '';
                for (let v of keyvals) {
                    if (v === -1) {
                        keyword += '?';
                    } else {
                        keyword += charset.substr(v, 1);
                    }
                }
                if (tdcount > 0 && tdcount % maxcols === 0) {
                    row = table.addBodyRow();
                }
                tdcount = tdcount + 1;
                row.add(String(pos)).add(
                    $('<a/>', {
                        class: 'vkey',
                        href: '#',
                    }).text(keyword)
                );
            }
        }
        let lookfor;
        if (tdcount === 0) {
            lookfor = $('<span/>').text(
                'Unable to find ' + str + ' as ' + this.normalizeHTML(str)
            );
        } else {
            lookfor = $('<span/>').text(
                'Searching for ' + str + ' as ' + this.normalizeHTML(str)
            );
            lookfor.append(table.generate());
        }

        $('.findres')
            .empty()
            .append(lookfor);
        this.attachHandlers();
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {
        this.encodedString = this.cleanString(this.state.cipherString);
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);
        $('#analysis').each((i, elem) => {
            $(elem)
                .empty()
                .append(this.genAnalysis(this.encodedString));
        });
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#keyword')
            .off('input')
            .on('input', e => {
                let keyword = $(e.target).val() as string;
                if (keyword !== this.state.keyword) {
                    this.markUndo(null);
                    if (this.setKeyword(keyword)) {
                        this.updateOutput();
                    }
                }
            });
        $('button.ls')
            .off('click')
            .on('click', e => {
                this.markUndo('ls');
                this.adjustKeyword(Number($(e.target).attr('data-row')), 1);
                this.updateOutput();
            });
        $('button.rs')
            .off('click')
            .click(e => {
                this.markUndo('ls');
                this.adjustKeyword(Number($(e.target).attr('data-row')), -1);
                this.updateOutput();
            });
        $('a.vkey')
            .off('click')
            .on('click', e => {
                let newkey = $(e.target).attr('data-key');
                if (newkey === undefined) {
                    newkey = $(e.target).html();
                }
                if (newkey !== this.state.keyword) {
                    this.markUndo(null);
                    if (this.setKeyword(newkey)) {
                        this.updateOutput();
                    }
                }
            });
    }
}
