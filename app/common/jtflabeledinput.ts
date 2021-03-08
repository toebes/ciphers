/**
 * Creates a Foundation labeled text box
 */
export function JTFLabeledInput(
    title: string,
    type: 'text' | 'number' | 'file' | 'textarea' | 'richtext' | 'checkbox' | 'password' | 'readonly',
    id: string,
    value: number | string | boolean,
    sizeClass: string
): JQuery<HTMLElement> {
    const inputgroup = $('<div/>', { class: 'input-group' });
    $('<span/>', { class: 'input-group-label' })
        .text(title)
        .appendTo(inputgroup);
    if (type === 'richtext') {
        $('<div/>', {
            id: id,
            class: 'input-group-field richtext',
            value: value,
        }).appendTo(inputgroup);
    } else if (type === 'textarea') {
        $('<textarea/>', {
            id: id,
            class: 'input-group-field',
            rows: 5,
        })
            .text(value)
            .appendTo(inputgroup);
    } else if (type === 'checkbox') {
        $('<input/>', {
            id: id,
            class: 'input-group-button checkbox',
            type: type,
            value: value,
        }).appendTo(inputgroup);
    } else if (type === 'readonly') {
        $('<p/>', {
            id: id,
            class: 'input-group-field readonly',
        }).text(value)
            .appendTo(inputgroup);
    } else {
        $('<input/>', {
            id: id,
            class: 'input-group-field',
            type: type,
            value: value,
        }).appendTo(inputgroup);
    }
    return $('<div/>', { class: 'cell ' + sizeClass }).append(inputgroup);
}

export function JTFLabeledInputApply(
    title: string,
    type: 'text' | 'number' | 'file' | 'textarea' | 'richtext',
    id: string,
    value: number | string,
    sizeClass: string,
    applyid: string,
    applyTitle: string
): JQuery<HTMLElement> {
    const inputgroup = $('<div/>', { class: 'input-group' });
    inputgroup.append($('<span/>', { class: 'input-group-label' }).text(title));
    if (type === 'richtext') {
        inputgroup.append(
            $('<div/>', {
                id: id,
                class: 'input-group-field richtext',
                value: value,
            })
        );
    } else if (type === 'textarea') {
        inputgroup.append(
            $('<textarea/>', {
                id: id,
                class: 'input-group-field',
                rows: 5,
            }).text(value)
        );
    } else {
        inputgroup.append(
            $('<input/>', {
                id: id,
                class: 'input-group-field',
                type: type,
                value: value,
            })
        );
    }

    inputgroup.append(
        $('<div/>', { class: 'input-group-button' }).append(
            $('<input/>', {
                class: 'button round',
                id: applyid,
                value: applyTitle,
            })
        )
    );

    return $('<div/>', { class: 'cell ' + sizeClass }).append(inputgroup);
}
