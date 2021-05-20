/**
 * CipherTestScorer - Class for breaking ties between interactive tests.
 */

/**
 * Information about a question that has been taken by a team
 */
export interface ITestQuestion {
    // non-displayed fields
    correctLetters: number;
    // displayed fields
    questionNumber: number;
    points: number;
    cipherType: string;
    incorrectLetters: number;
    deduction: number;
    score: number;
}

/**
 * Information about a test that has been taken by a team
 */
export interface ITestResultsData {
    // non-displayed fields
    bonusBasis: number;
    hasTimed: boolean;
    testId: string;
    isTieBroke: boolean;
    // displayed fields
    startTime: string;
    endTime: string;
    bonusTime: number;
    testTakers: string;
    score: number;
    teamname: string;
    teamtype: string;
    questions: ITestQuestion[];
}

/**
 * Creates a new test event scorer.
 */
export class CipherTestScorer {
    testCounter = 0;
    testResults: ITestResultsData[] = [];

    constructor() { }

    /**
     * Adds a test to the list.  The added test will be complete with all the questions
     * @param aTest the test to add.
     */
    addTest(aTest: ITestResultsData): void {
        this.testResults[this.testCounter] = aTest;
        this.testCounter++;
    }

    scoreTests(): ITestResultsData[] {
        // this is where the tie breaking and ranking is done.
        if (this.testResults.length === 0) {
            return this.testResults;
        }
        // Master list of scores and ties.
        const scoreMap = {};
        // Build a map with score as the key and an array of testIds as the value.  If an array has more than
        // one item, a tie must be broken.
        this.testResults.forEach((value, index) => {
            if (scoreMap[value.score] == undefined) {
                scoreMap[value.score] = [];
            }
            // -2 indicates a NoShow, so skip any tie breaking
            if (value.score !== -2) {
                scoreMap[value.score].push(value.testId);
            }
        });

        // sort the questions into tie-breaker order @see ciphertestanswers.ts tiebreakersort().
        // Get the questions, just take from first result.
        const tieBreakQuestions: ITestQuestion[] = this.testResults[0].questions;
        tieBreakQuestions.sort(this.tiebreakersort);

        // Stage 1 - based on fewer errors
        for (const m in scoreMap) {
            // Test if tie needs breaking for this score.
            if (scoreMap[m].length > 1) {
                let tiedCount = scoreMap[m].length - 1;
                console.log(
                    'Need to break tie (stage 1) for score: ' +
                    m +
                    '. There are ' +
                    (tiedCount + 1).toString() +
                    ' teams tied.'
                );

                // loop through tie-breaker questions
                for (const q of tieBreakQuestions) {
                    let higherScoringTest = undefined;
                    do {
                        higherScoringTest = this.getHigherScoringTest(
                            q.questionNumber,
                            scoreMap[m]
                        );

                        if (higherScoringTest !== undefined) {
                            // remove higher scoring test from scoreMap)
                            for (let i = 0; i < scoreMap[m].length; i++) {
                                if (scoreMap[m][i] === higherScoringTest) {
                                    // The next go around will have 1 less team...
                                    scoreMap[m].splice(i, 1);
                                }
                            }
                            // update score for the team ahead
                            for (const test of this.testResults) {
                                if (test.testId === higherScoringTest) {
                                    test.isTieBroke = true;
                                    test.score += Math.trunc(tiedCount * 0.1 * 10) / 10;
                                    tiedCount--;
                                    break; // out of the update the higher score for loop
                                }
                            }
                            if (scoreMap[m].length === 1) {
                                // We are done!
                                break; // out of the tie-breaker questions loop
                            }
                        }
                    } while (higherScoringTest !== undefined); // there are still might be ties for a particular question...
                }
            }
        }

        // Stage 2 - based on more correct letters
        for (const m in scoreMap) {
            if (scoreMap[m].length > 1) {
                let tiedCount = scoreMap[m].length - 1;
                console.log(
                    'Need to break tie (stage 2) for score: ' +
                    m +
                    '. There are ' +
                    (tiedCount + 1).toString() +
                    ' teams tied.'
                );

                const tiedTests = [];
                for (const t of scoreMap[m]) {
                    for (const test of this.testResults) {
                        if (test.testId === t) {
                            tiedTests.push(test);
                        }
                    }
                }

                const questionCount = tieBreakQuestions.length;
                for (const test of tiedTests) {
                    // calculate weighted score for each tied test.
                    let weightedScore = 0;
                    for (let i = 0; i < test.questions.length; i++) {
                        // skip question if there is nothing to add...
                        if (test.questions[i].correctLetters === 0) {
                            continue;
                        }

                        for (let tb = 0; tb < tieBreakQuestions.length; tb++) {
                            if (
                                tieBreakQuestions[tb].questionNumber ===
                                test.questions[i].questionNumber
                            ) {
                                weightedScore +=
                                    (questionCount - tb) * 10000 + test.questions[i].correctLetters;
                                break;
                            }
                        }
                    }
                    console.log(
                        'Test ' +
                        test.testId +
                        ' with takers ' +
                        test.testTakers +
                        ' has a correct count score of: ' +
                        weightedScore
                    );
                    test.weightedScore = weightedScore;
                }
                tiedTests.sort(function (a, b) {
                    return b.weightedScore - a.weightedScore;
                });

                for (const t of tiedTests) {
                    if (t.weightedScore > 0) {
                        console.log(
                            'Top score: ' +
                            t.weightedScore +
                            ' for test ' +
                            t.testId +
                            ' with takers: ' +
                            t.testTakers
                        );
                        t.isTieBroke = true;
                        t.score += Math.trunc(tiedCount * 0.1 * 10) / 10;
                        tiedCount--;
                        for (let i = 0; i < scoreMap[m].length; i++) {
                            if (scoreMap[m][i] === t.testId) {
                                // The next go around will have 1 less team...
                                scoreMap[m].splice(i, 1);
                            }
                        }
                    }
                }
                console.log(
                    'Stage 2 complete.  ' + scoreMap[m] + ' tied scores remaining at score: ' + m
                );
            }
        }

        // Stage 3 (coin flip -- sort of)
        // go through each score
        for (const m in scoreMap) {
            // find if there are multiple tests at a particular score.
            if (scoreMap[m].length > 1) {
                console.log('Tie-break algorithms exhausted...just flip a coin.');
                const scores = [];

                // go through each testId at a particular score 'm'
                for (const t of scoreMap[m]) {
                    // Check all test results...
                    for (const test of this.testResults) {
                        // Save that test
                        if (test.testId === t) {
                            scores.push(test);
                        }
                    }
                }
                // 'flip a coin' on this set of tied scores using a substring of the unique testId
                scores.sort(function (a, b) {
                    let aScore = parseInt(a.testId.substr(3, 5), 16);
                    const bScore = parseInt(b.testId.substr(3, 5), 16);
                    if (aScore === bScore) {
                        console.log('The impossible has happened...FIX IT!');
                        aScore += 1;
                    }
                    return aScore - bScore;
                });
                // Test have been sorted 'randomly', so break the ties based on the random sort order.
                for (let i = 0; i < scores.length; i++) {
                    console.log(
                        'Test ' +
                        scores[i].testId +
                        ' with takers ' +
                        scores[i].testTakers +
                        ' gets score: ' +
                        (scores[i].score + i * 0.1).toString()
                    );
                    scores[i].isTieBroke = true;
                    scores[i].score += Math.trunc(i * 0.1 * 10) / 10;
                }
            }
        }
        return this.testResults;
    }

    /**
     * Returns the higher scoring test for a particular question from an array of tests.
     * @param question the question to evaluate
     * @param testIds array of tests to check
     * @return testId of highest scoring test or undefined if there is a tie.
     */
    getHigherScoringTest(question: number, testIds: string[]): string {
        let returnValue = undefined;
        console.log(
            'Find highest score on question ' + question.toString() + ', out of ' + testIds
        );

        const testIdsWithFewestMistakes = [];

        // go thru array, and check the question
        let incorrectLettersCheck = 0;
        let maxIncorrectLetters = 1;

        // do while a team may have points on this question:
        while (
            /* testIdsWithFewestMistakes.length === 0 && */ incorrectLettersCheck <=
            maxIncorrectLetters
        ) {
            for (const t of testIds) {
                console.log('Check test ' + t);
                for (const test of this.testResults) {
                    if (test.testId === t) {
                        console.log('Found results for ' + t);
                        let testQuestion = undefined;
                        for (let i = 0; i < test.questions.length; i++) {
                            if (test.questions[i].questionNumber === question) {
                                console.log('Question ' + question + ' is at index: ' + i);
                                testQuestion = test.questions[i];
                                break;
                            }
                        }
                        console.log(
                            'Checking for ' +
                            incorrectLettersCheck.toString() +
                            ' incorrect letters against results containing incorrect: ' +
                            testQuestion.incorrectLetters.toString()
                        );
                        if (parseInt(testQuestion.incorrectLetters) === incorrectLettersCheck) {
                            console.log(
                                'Found a test (' +
                                t +
                                ') that scored correctly...the takers are: ' +
                                test.testTakers
                            );
                            testIdsWithFewestMistakes.push(t);
                        }
                        // Set max number of incorrect letters that will still give a score > 0.
                        if (maxIncorrectLetters === 1) {
                            maxIncorrectLetters = Math.floor(testQuestion.points / 100) + 2;
                        }
                        break; // once we find the test results for a tied test, we don't need to keep looking
                    }
                }
            }
            // We have now analyzed every tied test...
            // If only one team had fewest (or no) mistakes, it is ahead and we are done with it...
            if (testIdsWithFewestMistakes.length === 1) {
                returnValue = testIdsWithFewestMistakes[0];
                console.log('We have a winner! (' + returnValue + ') Exiting...');
                break;
            } else if (testIdsWithFewestMistakes.length === testIds.length) {
                // All tests are still tied, so go on to next question...
                console.log('All tests are tied, next question please...');
                break;
            } else {
                // try next fewest mistakes.
                incorrectLettersCheck++;
                console.log(
                    'incorrectLettersCheck incremented to ' + incorrectLettersCheck.toString()
                );
            }
        }
        return returnValue;
    }

    /**
     * Sorter to determine the order of questions to be evaluated...
     * copied from ciphertestanswers.ts tiebreakersort()
     * @param a
     * @param b
     */
    public tiebreakersort(a: any, b: any): number {
        if (a.points > b.points) {
            return -1;
        } else if (a.points < b.points) {
            return 1;
        } else if (a.questionNumber > b.questionNumber) {
            return -1;
        } else if (a.questionNumber < b.questionNumber) {
            return 1;
        }
        return 0;
    }

    toString(): string {
        let returnValue = '';
        returnValue += 'Number of tests: ' + this.testCounter + '\n';
        return returnValue;
    }
}
