# Test cases

This file represents test cases that failed at one time or another.  Perhaps we can build some sort of automated infrastructure to have a list of this and run them through the code as an integration test.

## Morbit

### Test question

```json
"CIPHER.7": {
    "cipherString": "the quick brown fox slept in a tent",
    "cipherType": "morbit",
    "replacement": {
        "OO": "1",
        "O-": "2",
        "OX": "3",
        "-O": "4",
        "--": "5",
        "-X": "6",
        "XO": "7",
        "X-": "8",
        "XX": "9"
    },
    "operation": "decode",
    "curlang": "en",
    "points": 0,
    "question": "<p>This question breaks the solver</p>",
    "editEntry": "7",
    "offset": null,
    "alphabetSource": "",
    "alphabetDest": "",
    "shift": null,
    "offset2": null,
    "hint": "1234"
}
```

### Error

The solver decoded to:

```text
THE QUIC A BR MW E FOX SLEPT IN A TEN
```

The mapper looks like:

```text
1   2   3   4   5   6   7   8   9
●●  ●–  ●×  –●  ––  –×  ×●  ××  ××
```

There is a problem with 8 and 9 both resolving to `xx`.
