/**
 * Creates a labeled number field with increment/decrement buttons
 */
export function JTFIncButton(
    title: string,
    id: string,
    val: number,
    sizeClass: string
): JQuery<HTMLElement> {
    const inputgroup = $('<div/>', { class: 'input-group cell ' + sizeClass });

    $('<span/>', { class: 'input-group-label' })
        .text(title)
        .appendTo(inputgroup);
    $('<div/>', { class: 'input-group-button' })
        .append($('<span/>', { class: 'input-number-decrement' }).text('-'))
        .appendTo(inputgroup);
    $('<input/>', {
        id: id,
        class: 'input-number',
        type: 'number',
        value: val,
    }).appendTo(inputgroup);
    $('<div/>', { class: 'input-group-button' })
        .append($('<span/>', { class: 'input-number-increment' }).text('+'))
        .appendTo(inputgroup);
    return inputgroup;
}
