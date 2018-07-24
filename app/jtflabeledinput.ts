/**
 * Creates a Foundation labeled text box
 */
export function JTFLabeledInput(title: string,
                                type: 'text' | 'number' | 'file' | 'richtext',
                                id: string,
                                value: number | string,
                                sizeClass: string
): JQuery<HTMLElement> {
    let inputgroup = $("<div/>", { class: "input-group cell " + sizeClass })
    $("<span/>", { class: "input-group-label" }).text(title)
        .appendTo(inputgroup)
    if (type === 'richtext') {
        $("<div/>", { id: id, class: 'input-group-field richtext', value: value }).appendTo(inputgroup)
    } else {
        $('<input/>', {
            id: id, class: 'input-group-field',
            type: type, value: value
        }).appendTo(inputgroup)
    }
    return inputgroup
}
