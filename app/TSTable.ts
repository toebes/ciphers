export interface TSTDParms {
    celltype?: string
    settings?: JQuery.PlainObject
    content?: JQuery<HTMLElement> | string
}
export type TSElem = JQuery<HTMLElement> | string | JQuery.PlainObject
export type TSRowItems = Array<TSElem>

export interface TSTableParms {
    class?: string
    caption?: string
    head?: Array<TSRowItems>
    body?: Array<TSRowItems>
    foot?: Array<TSRowItems>
}
/**
 * Determines if a parameter is a plain string
 * @param x Item to test
 */
function isString(x: any): x is string {
    return typeof x === "string"
}

function isTDParms(x: any): x is TSTDParms {
    return x.celltype !== undefined
}

export interface TSRowParms {
    class?: string
    celltype?: string
    row?: TSRowItems
}


/**
 * Determines the type of a parameter for a new row so that you
 * don't have to pass in the class or other attributes if you only
 * want to create a simple row
 * @param parms 
 */
function isRowParms(parms: TSRowParms | TSRowItems): parms is TSRowParms {
    return true;
}

export class TSRow {
    class: string
    celltype: string
    row: TSRowItems
    constructor(parms?: TSRowParms | TSRowItems) {
        this.celltype = "td"
        this.class = undefined
        this.row = []
        if (parms !== null && parms !== undefined ) {
            if (Array.isArray(parms)) {
                this.row = <TSRowItems>parms
            } else {
                if (parms.class !== undefined) {
                    this.class = parms.class
                }
                if (parms.celltype !== undefined) {
                    this.celltype = parms.celltype
                }
                if (parms.row !== undefined) {
                    this.row = parms.row
                }
            }
        }
    }
    setClass(tclass: string):TSRow {
        this.class = tclass
        return this
    }
    setCellType(celltype: string):TSRow{
        this.celltype = celltype
        return this
    }
    /**
     * Adds a new element to the row.  This returns the row so you can chain
     * @param elem Element to be added (string | JQuery<HTMLElement>)
     */
    add(elem: TSElem): TSRow {
        if (elem !== null && elem !== undefined) {
            this.row.push(elem)
        }
        return this
    }
    /**
     * Generates the dom object from this Row.  Note that if the row is empty
     * we don't generate anything at all
     */
    generate(): JQuery<HTMLElement> {
        // If the row is empty, we toss it out
        if (this.row.length === 0) {
            return null
        }
        let row = $("<tr>")
        for (let item of this.row) {
            let cell = null
            let celltype = this.celltype
            if (isTDParms(item)) {
                if (item.celltype !== null && item.celltype !== undefined){
                    celltype = item.celltype
                }
                cell = $("<" + celltype + ">", item.settings).append(item.content)
            } else {
                cell = $("<" + celltype + ">")
                // For strings we want to set the text of the cell so that it doesn't
                // attempt to interpret it as html
                if (isString(item)) {
                    cell.text(item)
                } else {
                    cell.append(item)
                }
                row.append(cell)
            }
        }
        return row
    }
}

/**
 * Creates a new table object that can be used to generate an HTML Table
 */
export default class TSTable {
    class: string = null
    caption: string = null
    header: Array<TSRow> = []
    body: Array<TSRow> = []
    footer: Array<TSRow> = []

    constructor(parms: TSTableParms) {
        this.class = parms.class
        this.caption = parms.caption
        if (parms.head !== undefined) {
            for (let rowdata of parms.head) {
                this.addHeaderRow(rowdata)
            }
        }
        if (parms.body !== undefined) {
            for (let rowdata of parms.body) {
                this.addBodyRow(rowdata)
            }
        }
        if (parms.foot !== undefined) {
            for (let rowdata of parms.foot) {
                this.addFooterRow(rowdata)
            }
        }
    }

    /**
     * Adds a new header row and returns it so you can add elements to it
     * @param parms Header row items to add
     */
    addHeaderRow(parms?: TSRowParms | TSRowItems): TSRow {
        let newRow = new TSRow(parms).setCellType("th")
        this.header.push(newRow)
        return newRow
    }

    /**
     * Adds a new body row and returns it so you can add elements to it
     * @param parms Body row items to add
     */
    addBodyRow(parms?: TSRowParms | TSRowItems): TSRow {
        let newRow = new TSRow(parms)
        this.body.push(newRow)
        return newRow
    }

    /**
     * Adds a new Footer row and returns it so you can add elements to it
     * @param parms Footer row items to add
     */
    addFooterRow(parms?: TSRowParms | TSRowItems): TSRow {
        let newRow = new TSRow(parms)
        this.footer.push(newRow)
        return newRow
    }
    /**
     * Generates the final table using everything that was gathered
     */
    generate(): JQuery<HTMLElement> {
        let table = $("<table>", { class: this.class })
        if (this.header.length) {
            let thead = $("<thead>")
            for (let row of this.header) {
                thead.append(row.generate())
            }
            table.append(thead)
        }
        if (this.body.length) {
            let tbody = $("<tbody>")
            for (let row of this.body) {
                tbody.append(row.generate())
            }
            table.append(tbody)
        }
        if (this.footer.length) {
            let tfoot = $("<tfoot>")
            for (let row of this.footer) {
                tfoot.append(row.generate())
            }
            table.append(tfoot)
        }
        return table
    }
}
