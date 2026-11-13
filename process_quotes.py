#!/usr/bin/env python3
"""Correct missing apostrophes and count unknown quote words (Python 3.9+)."""
import argparse
import csv
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

REPLACEMENTS = dict(zip(
    'ARENT DOESNT ELSES HADNT HASNT HAVENT IM IVE OCLOCK THATS THERES THEYRE THEYVE WERENT WEVE WHOS YOURE DONT HED GENTLEMANS'.split(),
    "aren't doesn't else's hadn't hasn't haven't i'm i've o'clock that's there's they're they've weren't we've who's you're don't he'd gentleman's".split(),
))
# Letters, optionally joined by apostrophes. Hyphens separate tokens; digits
# and underscores also separate tokens. Unicode letters are supported.
TOKEN = re.compile(r"[^\W\d_]+(?:['\u2019\u2018\u02bc][^\W\d_]+)*", re.UNICODE)
APOSTROPHES = str.maketrans({'\u2019': "'", '\u2018': "'", '\u02bc': "'"})


def normalize(word):
    return unicodedata.normalize('NFC', word).translate(APOSTROPHES).casefold()


def correct_match(match):
    original = match.group()
    replacement = REPLACEMENTS.get(original.upper())
    if replacement is None:
        return original
    # Insert only the apostrophe, keeping every original letter's case,
    # including unusual mixed case such as tHaTs -> tHaT's.
    position = replacement.index("'")
    return original[:position] + "'" + original[position:]


def delimiter(value):
    value = '\t' if value == r'\t' else value
    if len(value) != 1:
        raise argparse.ArgumentTypeError('delimiter must be one character (or \\t)')
    return value


def load_dictionary(args):
    words = set()
    with args.dictionary.open('r', encoding=args.dictionary_encoding, newline='') as stream:
        if args.dictionary_format == 'lines':
            entries = (line.strip() for line in stream)
            for entry in entries:
                if entry:
                    words.add(normalize(entry))
        else:
            reader = csv.DictReader(stream, delimiter=args.dictionary_delimiter, strict=True)
            if not reader.fieldnames or args.dictionary_column not in reader.fieldnames:
                raise ValueError(f'Dictionary column {args.dictionary_column!r} not found')
            for number, row in enumerate(reader, 2):
                if None in row or any(value is None for value in row.values()):
                    raise ValueError(f'Malformed dictionary CSV record {number}')
                entry = row[args.dictionary_column].strip()
                if entry:
                    words.add(normalize(entry))
    if not words:
        raise ValueError('Dictionary has no nonempty entries')
    return words


def process(args):
    sources = [args.input.resolve(), args.dictionary.resolve()]
    targets = [args.output.resolve(), args.unknown.resolve()]
    if targets[0] == targets[1] or any(target in sources for target in targets):
        raise ValueError('Output paths must differ from each other and all input paths')
    if not args.overwrite and any(path.exists() for path in targets):
        raise ValueError('An output file already exists; choose new paths or use --overwrite')
    csv.field_size_limit(2**31 - 1)
    valid = load_dictionary(args)
    occurrences, quote_counts = Counter(), Counter()
    rows = changed = 0
    with args.input.open('r', encoding=args.encoding, newline='') as source:
        reader = csv.DictReader(source, delimiter=args.delimiter, strict=True)
        fields = reader.fieldnames
        required = [args.quote_column, args.author_column, args.notes_column]
        if len(set(required)) != 3:
            raise ValueError('Quote, author, and notes columns must be distinct')
        if not fields or len(set(fields)) != len(fields):
            raise ValueError('Input needs a header with unique column names')
        if any(column not in fields for column in required):
            raise ValueError(f'Required columns: {required!r}; found: {fields!r}')
        if 'nonwords' in required:
            raise ValueError("The name 'nonwords' is reserved for the generated output column")
        output_fields = fields if 'nonwords' in fields else fields + ['nonwords']
        with args.output.open('w' if args.overwrite else 'x', encoding=args.output_encoding, newline='') as destination:
            writer = csv.DictWriter(destination, fieldnames=fields, delimiter=args.delimiter)
            writer = csv.DictWriter(destination, fieldnames=output_fields, delimiter=args.delimiter)
            writer.writeheader()
            for number, row in enumerate(reader, 2):
                if None in row or any(value is None for value in row.values()):
                    raise ValueError(f'Malformed input CSV record {number}: wrong number of fields')
                original = row[args.quote_column]
                corrected = TOKEN.sub(correct_match, original)
                row[args.quote_column] = corrected
                writer.writerow(row)
                unknown = Counter(normalize(m.group()) for m in TOKEN.finditer(corrected))
                unknown = Counter({word: count for word, count in unknown.items() if word not in valid})
                row['nonwords'] = ', '.join(unknown)
                writer.writerow(row)
                occurrences.update(unknown)
                quote_counts.update(unknown.keys())
                rows += 1
                changed += corrected != original
    with args.unknown.open('w' if args.overwrite else 'x', encoding=args.output_encoding, newline='') as destination:
        writer = csv.writer(destination, delimiter=args.delimiter)
        writer.writerow(['word', 'occurrence_count', 'quote_count'])
        for word, count in sorted(occurrences.items(), key=lambda item: (-item[1], item[0])):
            writer.writerow([word, count, quote_counts[word]])
    print(f'Processed {rows:,} rows; corrected {changed:,} quotes; '
          f'found {len(occurrences):,} distinct unknown words ({sum(occurrences.values()):,} occurrences).')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('input', type=Path, help='quotes CSV, with a header')
    parser.add_argument('dictionary', type=Path, help='dictionary text or CSV file')
    parser.add_argument('--output', type=Path, default=Path('corrected_quotes.csv'))
    parser.add_argument('--unknown', type=Path, default=Path('unknown_words.csv'))
    parser.add_argument('--quote-column', default='quote')
    parser.add_argument('--author-column', default='author')
    parser.add_argument('--notes-column', default='notes')
    parser.add_argument('--encoding', default='utf-8-sig', help='input CSV encoding')
    parser.add_argument('--output-encoding', default='utf-8-sig')
    parser.add_argument('--delimiter', type=delimiter, default=',', help='input/output CSV delimiter')
    parser.add_argument('--dictionary-format', choices=['lines', 'csv'], default='lines')
    parser.add_argument('--dictionary-encoding', default='utf-8-sig')
    parser.add_argument('--dictionary-column', default='word', help='header name for CSV dictionary')
    parser.add_argument('--dictionary-delimiter', type=delimiter, default=',')
    parser.add_argument('--overwrite', action='store_true', help='allow replacing existing outputs')
    args = parser.parse_args()
    try:
        process(args)
    except (OSError, UnicodeError, ValueError, csv.Error, LookupError) as error:
        print(f'Error: {error}\nOutputs may be incomplete if processing had already started.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())