# Runtime Answer Data for Synchromization
In the codebusters_answers collection, each test entry has JSON data for an instance of a test which nominally looks like:
```
  {
  "testid": "<testid>",
  "users": ["user1", "user2", "user3"],
  "starttime": <datetime>,
  "endtime": <datetime>
  "answers" : [{answer: [],
                replacements: [],
                separators:[],
                notes: ""}]
  }
```
* `testid` is an id of the separate test JSON file describing the contents of the test.
*  `users` is the list of userids assigned to work on the test
* `starttime` is the time at which the test is considered open for solving.
* `endtime` is the time at which the test is no longer open for solving.
* `answers` is the runtime data to track the answer for each question.  It maps to the `ITestQuestionsFields` struct defined in `cipherhandler.ts`.
* ITestQuestionFields is the runtime data to track the answer to a particular question.
This is an array of maps with the first entry corresponding to the timed question
with an empty entry for tests which do not have a timed question.

## ITestQuestionsFields

Each test entry has fields which correspond to the usage by the cipher.  Most cipher types have all four fields (and could have additional ones) but most commonly these are
* `answer` - The solution text entered
* `replacements` - any replacement characters. For the aristocrat this corresponds to the frequency table.
For the Hill cipher, it is whatever they put on top of the letters. 
For the Vigenère it is the line above the letters where they can put the encoding letter.
* `notes` - The text box below the question for whatever notes the team wants to put.
* `separators` - Indicators of where word breaks are to be displayed as an aid for solving a cipher.  This is used for Patristocrats, Baconian, Tap Code and Pig Pen ciphers. 
If the entry is a `|` then a vertical line is drawn after the character.  Otherwise no line is drawn.

### `answer`

Each spot is a single character.  This includes the answer characters with spaces for non valid characters. If the cipher was
```
X PDR'M AXVC
```
and the answer typed was:
```
I DON'T LIKE
```
Then the answer array will be `{"I", " ", "D", "O", "N", " ", "T", " ", "L", "I", "K", "E"}`

Typically the answer is bound to a RealTimeArray
```
let realtimeAnswer = realTimeElement.elementAt("answer") as RealTimeArray;
realtimeAnswer.on("set", (event: ArraySetEvent) => { this.propagateAns(qnumdisp, event.index, event.value.value()); });
```
The generated HTML fields are typically an input field with the `awc` class and an ID of the form

> **I<em>&lt;qnum&gt;</em>_<em>&lt;offset&gt;</em>**

Where <em>&lt;qnum&gt;</em> is the question number (0 for timed) and <em>&lt;offset&gt;</em> is the index in the array.
In the array case, usually these fields will only contain a single character and can be populated vi keyup/keypress
events (look in interactiveencoder.ts for an example).

In the case where the field could be a number or string (like in the Hill cipher) instead of binding with a RealTimeArray, each of the fields are bound as a textInput such as:
```
let realtimeAnswer = realTimeElement.elementAt("answer") as RealTimeArray;
let answers = realtimeAnswer.value();
for (var i in answers) {
    let answerfield = $("#I" + qnumdisp + "_" + String(i));
     bindTextInput(answerfield[0] as HTMLInputElement, realtimeAnswer.elementAt(i));
}
```

### `replacements`
The replacement choices that has been entered on the test. 
This is applicable to most ciphers 

Like the answer field, this is also typically bound to a RealTimeArray

```
let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
realtimeReplacement.on("set", (event: ArraySetEvent) => { this.propagateRepl(qnumdisp, event.index, event.value.value()); });
```

The generated HTML fields are typically an input field with the `awr` class and an ID of the form

> **R<em>&lt;qnum&gt;</em>_<em>&lt;offset&gt;</em>**

Where <em>&lt;qnum&gt;</em> is the question number (0 for timed) and <em>&lt;offset&gt;</em> is the index in the array.

In the array case, usually these fields will only contain a single character and can be populated vi keyup/keypress
events (look in interactiveencoder.ts for an example).

In the case where the field could be a number or string (like in the Hill cipher) instead of binding with a RealTimeArray,
each of the fields are bound as a textInput such as:

```
let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
let replacements = realtimeReplacement.value();
for (var i in replacements) {
    let replacementfield = $("#R" + qnumdisp + "_" + String(i));
     bindTextInput(replacementfield[0] as HTMLInputElement, realtimeReplacement.elementAt(i));
}
```

### `separators`
/** Deliberate separators between letters to aid in solving a Patristocrat  */
        let realtimeSeparators = realTimeElement.elementAt("separators") as RealTimeArray;
        if (realTimeElement.hasKey("separators")) {
            let separators = realtimeSeparators.value();
            realtimeSeparators.on("set", (event: ArraySetEvent) => { this.propagateSep(qnumdisp, event.index, event.value.value()); });
            for (var i in separators) {
                this.propagateSep(qnumdisp, Number(i), separators[i]);
            }
        }

### `notes`
Any notes typed in the work section below the cipher.
This is typically bound to a textarea field with a class of `intnote` and an id of the form

> **in<em>&lt;qnum&gt;</em>**

Where &lt;qnum&gt; is the question number (0 for timed)

The textarea is bound with bindTextInput as follows:

```
const textArea = $("#in" + qnumdisp)[0] as HTMLTextAreaElement;
bindTextInput(textArea, realTimeElement.elementAt("notes") as RealTimeString);
```
