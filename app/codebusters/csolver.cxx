// 
// This program will solve puzzles called Alphametics or Cryptarithms.
// It can also be used to find new puzzles.
//
// For an explanation of this type of puzzle and a description of how
// to run this program either invoke the program with the -help switch
// or look at the function print_usage below.
//
// I have written this to be as fast as possible because the procedure
// of looking for these puzzles given a set of words is quite time
// intensive.  Because of this, I haven't broken up the functions into
// as small units as would be good for readability.  I previously
// wrote a program to solve this sort of puzzle and did it using
// recursion.  It was cleaner and easier to understand, but it was
// significantly slower.  This program uses a single function to find
// solutions to a puzzle and it makes no function calls.  I have
// commented the code well, but it's still not as clear as a slower
// more modular layout would have been.
//
// This program was written in C++, although it doesn't use any
// classes.  It wouldn't be too difficult to convert to C.  I used
// stdio.h rather than stream.h to save executable size.
//
// Here are some examples of puzzles that this can solve or generate:
//
//     I   SEND 
//   +BB  +MORE
//   ---  -----
//   ILL  MONEY
//
// Try swp -solve send more money
//     swp -find money hello send goodbye more
//
// Both solving puzzles and looking for them can be done by invoking
// with just the -solve or -find argument and letting the program
// prompt for the appropriate input.  This allows more flexibility
// particularly with -find.  The base to use as well as what puzzles
// are acceptable can be specified if just the command line isn't
// used.
//
// By Truman Collins
// 1988
// May and June 1998
//
// Copyright 1998 by Truman Collins

#include <memory.h>
#include <stdlib.h>
#include <ctype.h>
#include <time.h>
#include <stdio.h>

typedef unsigned long ulong;

// For the sake of efficiency, we limit the maximum base to 16 and
// the maximum length of a string to 16 characters.  These can
// be increased.  MAX_BASE can be increased arbitrarily.  MAX_LEN
// must be increased by powers of two and MAX_LEN_SHIFT must be
// increased so that 2^MAX_LEN_SHIFT == MAX_LEN

const int MAX_BASE = 16;
const int MAX_LEN = 16;
const int MAX_LEN_SHIFT = 4;

// We won't allocate an array for the summands, but will use a
// static one if there are this many or fewer.

const int MAX_STATIC_SUMMANDS = 6;
const int MAX_WORDS = 2000;

// Min and max inlines.

int min_of_two(int x, int y)
   {
      return((x < y) ? x : y);
   }
int max_of_two(int x, int y)
   {
      return((x > y) ? x : y);
   }

// Define this to 1 to print the estimated difficulty of solved
// and found puzzles.  Define to 0 if you don't want the difficulty printed.

#define DIFF_PRINT 1

// I have included some pretty verbose debugging code.  If DEBUG_SOLVE_FLAG
// is defined then the debug code will be compiled and executed for the
// solve function.  If DEBUG_FIND_FLAG is defined, then debugging will be
// enabled for finding puzzles.  When these are not defined, no debugging
// will be generated.

// #define DEBUG_SOLVE_FLAG

#ifdef DEBUG_SOLVE_FLAG
#define DBG_SOLVE(statement) { \
   statement \
}
#else
#define DBG_SOLVE(statement)
#endif

// #define DEBUG_FIND_FLAG

#ifdef DEBUG_FIND_FLAG
#define DBG_FIND(statement) { \
   statement \
}
#else
#define DBG_FIND(statement)
#endif


void print_solution(
      int  number_map[128],
      int  map_count[128]
   )
   // Print the mappings for this solution.  The mappings will be in
   // alphabetical order.
   {
      int i;


      for(i = 0; i < 128; i++) {

         // Test map_count because number_map is not initialized.

         if(map_count[i]) {
            printf("%c=%d ", (char) i, number_map[i]);
         }
      }
      printf("\n");
   }


int difficulty_conv(
      ulong  backtracks
   )
   // Return a difficulty rating based on the number of backtracks.
   {
      if(backtracks <= 100) {
         return(1);
      }
      if(backtracks <= 600) {
         return(2);
      }
      if(backtracks <= 4000) {
         return(3);
      }
      if(backtracks <= 20000) {
         return(4);
      }
      return(5);
   }


// Macro to simulate multi-dimensional array reference.
// Note that this can't be an inline because the array is internal to the
// function.  Used only by the solve function.

#define summand_char(row, column) (reform_smnds[((row) << MAX_LEN_SHIFT) + \
        (column)])

int solve(
      char **summands,        // An array of pointers to the summands.
      int    summand_count,   // The number of summands.
      int   *summand_lengths, // An array with the lengths o the summands.
      int    longest_summand, // The number of chars in the longest summand.
      char  *sum,             // The word representing the sum.
      int    base,            // The base to solve the puzzle in.
      int    print,           // 1 if results to be printed, 0 otherwise.
      int    just_one,        // 1 if to leave after first solution.
      int   *difficulty       // The difficulty on a scale of 1 to 10.
   )
   // This function will find solutions to the given alphametic puzzle.
   // It returns the number of solutions found.  If just_one is set to
   // a non-zero value, the function will return after finding the first
   // solution.  If print is set to a non-zero value, each solution found
   // will be printed to stdout.
   // I have written this to be as fast as possible because one of its
   // intended uses is to check a huge number of potential puzzles for
   // ones that have a solution.  Because searches of this kind can be
   // very time consuming, even small efficiencies in this function are
   // significant.  Because of this, all of the work is done is this one
   // function, so it is very long.  I had previously written a recursive
   // version of this that was more easily understandable, but it was
   // significantly slower.
   {
      int     allocated_smnds_array;
      int     backtrack;
      ulong   backtrack_count = 0;
      char   *ch_p;
      int     column;
      int     column_lengths[MAX_LEN + 1];
      char    curr_char;
      int     curr_column;
      int     curr_smnd_row;
      int     i, j;
      char    letter_map[MAX_BASE];
      char    letter_used[128];
      int     map_count[128];
      int     min_possible;
      int     min_value[128];
      int     max;
      int     max_carry[MAX_LEN + 1];
      int     max_digit = base - 1;
      int     max_possible;
      int     max_value[128];
      int     needed_carry[MAX_LEN];
      int     needed_sum;
      int     number_map[128];
      char   *reform_smnds;
      char    smnd_char;
      int     solutions_found = 0;
      char    static_summands[MAX_LEN * MAX_STATIC_SUMMANDS];
      int     sum_length = 0;
      int     total_letters_used = 0;
      int     value;
      int     zero_or_one_start[128];


      // Initialize in case of an error.

      *difficulty = 0;

      // Figure out the length of the sum and at the same time count
      // the different characters used in the sum.  We will later
      // add to this count to find the number of different letters
      // used in the whole puzzle.

      memset(letter_used, 0, sizeof(letter_used));
      for(ch_p = sum; *ch_p; ch_p++) {
         if(letter_used[*ch_p] == 0) {
            letter_used[*ch_p] = 1;
            total_letters_used++;
         }
         sum_length++;
      }

      // See if any of the strings is too long.  If so print message
      // and return zero.

      if(sum_length > MAX_LEN || longest_summand > MAX_LEN) {
         printf("Words must all be %d characters or less.\n", MAX_LEN);
         return(0);
      }

      // If a summand is longer than the sum, then there is no solution.

      if(longest_summand > sum_length) {
         return(0);
      }

      // Initialize column lengths and needed_carry to 0.

      memset(column_lengths, 0, sizeof(column_lengths));
      memset(needed_carry, 0, sizeof(needed_carry));

      // Initialize the array used to count mappings for each character.

      memset(map_count, 0, sizeof(map_count));

      // Initialize the lowest value for each character to be zero.  We
      // later set those letters at the front of strings to one.

      memset(zero_or_one_start, 0, sizeof(zero_or_one_start));

      // Because malloc is somewhat expensive, and this routine needs to
      // be as fast as possible, only allocate this array if there are
      // too many summands to fit in the array on the stack.  This one
      // will hold MAX_STATIC_SUMMANDS.

    //   if(summand_count <= MAX_STATIC_SUMMANDS) {
         reform_smnds = static_summands;
         allocated_smnds_array = 0;
    //   } else {
    //      reform_smnds = new char[MAX_LEN * summand_count];
    //      allocated_smnds_array = 1;
    //   }

      // Zero the array used to map numbers to characters.

      memset(letter_map, 0, sizeof(letter_map));

      // Reformat summands.  We want the columns to match with the
      // sum string, but we want all of the letters crammed up to
      // the top rows.  For example:
      //
      //      I S      E N I S
      //      I T        A I T
      //    N O T   =>     O T
      //  E A S Y          S Y
      //      T O          T O
      //
      // We don't care what's in the other places since the
      // column_lengths array keeps us from accessing a character
      // that's not filled.
      // While we're doing this, we note those characters at the
      // front of the strings to insure that they can't be set
      // to zero.  We also count the number of different characters
      // in the puzzle.  We will use this to insure there aren't
      // more characters than digits.

      for(i = 0; i < summand_count; i++) {
         for(j = 0; j < summand_lengths[i]; j++) {
            column = sum_length - (summand_lengths[i] - j);
            curr_char = summands[i][j];
            summand_char(column_lengths[column], column) = curr_char;
            column_lengths[column]++;

            // Note which letters are used.

            if(letter_used[curr_char] == 0) {
               letter_used[curr_char] = 1;
               total_letters_used++;
            }

            // If this is the first character in a string make sure it
            // can never be set to zero.

            if(j == 0) {
               zero_or_one_start[curr_char] = 1;
            }
         }
      }

      // Note that the first letter of the sum also can't be a zero.

      zero_or_one_start[sum[0]] = 1;

      // See if we have more letters than digits, in which case a
      // solution is impossible.

      if(total_letters_used > base) {
        //  if(allocated_smnds_array) {
        //     delete [] reform_smnds;
        //  }
         return(0);
      }

      // Figure out what the maximum carry is from each column.
      // Note that the max carry from a specific column can depend
      // on the max carry on the column immediately to the right.
      // We initialize the max carry of the column one past the
      // last one to zero.
      // There is one possible improvement here and that is to do
      // some analysis of the letters in each column.  If they are
      // different, then the highest total from that row is a bit
      // less than the number of summands times the max digit.
      // This improvement is probably more expensive than it's
      // worth.

      max_carry[sum_length] = 0;
      for(i = sum_length - 1; i >= 0; i--) {
         max_carry[i] = (max_digit * column_lengths[i] +
                         max_carry[i + 1]) / base;
      }

      // When debugging, print out the summands in their new form.

      DBG_SOLVE(
         for(i = 0; i < summand_count; i++) {
            for(j = 0; j < MAX_LEN; j++) {
              if(i < column_lengths[j]) {
                 printf("%c", summand_char(i, j));
              } else {
                 printf(" ");
              }
            }
            printf("\n");
         }
         for(i = 0; i < strlen(sum); i++) {
            printf("-");
         }
         printf("\n%s\n", sum);
      );

      // Now all of the initialization is done and it is time to start
      // the analysis.  We start at the leftmost character in the sum
      // and work our way up the column of summands above.  When we get
      // to the top of it, we move to the next sum character and continue.
      // At each point we determine the possible values the current
      // character could take and for each one of these values, try all
      // downstream possibilities.  If we find a value for the topmost
      // summand in the rightmost column and no carry is required from
      // the next column, we have a solution.  When we run across a
      // dead end, we backtrack to the previous character.

      // We start with column 0 and the first move isn't a backtrack.

      curr_column = 0;
      backtrack = 0;

      while(1) {

         // See if we've found a solution

         if(curr_column == sum_length) {

            // This is only a solution if the needed carry here is zero.
            // Even if it isn't we need to backtrack from here.

            if(needed_carry[curr_column] == 0) {

               // Record that we found a solution and print it if desired.
               // backtrack to the previous column.

               solutions_found++;
               if(print) {
                  print_solution(number_map, map_count);
               }

               // If we just wanted to see if there were any solutions,
               // return right now.

               if(just_one) {
                //   if(allocated_smnds_array) {
                //      delete [] reform_smnds;
                //   }
                  return(1);
               }
            }

            // Backtrack and see if we can find another.

            curr_column--;
            curr_smnd_row = 0;
            backtrack = 1;
            smnd_char = summand_char(curr_smnd_row, curr_column);

            // We want to skip looking at the sum character in this column
            // because there isn't one.

         } else {

            // We're now working on the sum character in the
            // curr_column position.  There are two main
            // possibilities.  Either we are moving forward at this
            // time, or we are backtracking to this location.  If
            // we're moving forward, we either use a value chosen
            // earlier in the search for this letter, or if this is
            // the first occurance, select a value to try.  If we're
            // backtracking at this point, either select the next
            // available value for this letter, or if it already has a
            // value then backtrack more.  After dealing with the
            // value for this letter, we will either move forward and
            // investigate the values of the summands above, or we'll
            // backtrack again.

            curr_char = sum[curr_column];

            DBG_SOLVE(
               if(backtrack) {
                  printf("Back");
               } else {
                  printf("Forward");
               }
               printf(" to sum char %c(%d)...", curr_char, curr_column);
            );

            if(backtrack) {

               // We got here by backtracking, so we assigned this character a
               // value the last time through.

               if(map_count[curr_char] == 1) {

                  // This was the first occurance of this character.  Since
                  // we've backtracked to here, try to find the next available
                  // number in the range.

                  value = number_map[curr_char];
                  letter_map[value] = '\0';
                  do {
                     value++;
                  } while(value <= max_value[curr_char] &&
                          letter_map[value] != '\0');

                  if(value > max_value[curr_char]) {

                     // We didn't find an available number in the range so
                     // we want to backtrack from here.

                     backtrack = 1;
                     backtrack_count++;
                     map_count[curr_char]--;

                     DBG_SOLVE(
                        printf("no more values in range.\n");
                     );

                  } else {

                     // Go forward with this new value.  No change in map_count
                     // for this character because we unmapped one and mapped
                     // another.

                     backtrack = 0;
                     letter_map[value] = curr_char;
                     number_map[curr_char] = value;

                     DBG_SOLVE(
                        printf("next value in range: %d\n", value);
                     );
                  }

               } else {

                  // Since there is another one of these characters mapped
                  // behind us, we can't change the mapping here.  We want
                  // to backtrack.  Decrement the number of times this
                  // character has been mapped.  The letter itself is still
                  // mapped from a previous character.

                  backtrack = 1;
                  backtrack_count++;
                  map_count[curr_char]--;

                  DBG_SOLVE(
                     printf("previously mapped character.\n");
                  );
               }

            } else {

               // Here, we've moved forward to this sum character.

               if(needed_carry[curr_column] > max_carry[curr_column]) {

                  // Since we can't possibly get a carry this large, backtrack.

                  backtrack = 1;
                  backtrack_count++;

                  DBG_SOLVE(
                     printf("none available %d > %d.\n", needed_carry[curr_column], max_carry[curr_column]);
                  );

               } else {

                  if(map_count[curr_char]) {

                     // A value has already been chosen for this character.  Use
                     // it and move on.

                     value = number_map[curr_char];
                     map_count[curr_char]++;

                     DBG_SOLVE(
                        printf("previously chosen value %d\n", value);
                     );

                  } else {

                     // Here no value has been chosen for this letter.  We
                     // will determine the range of values that could work
                     // for it and choose the first available to try.

                     // The min is always going to be either zero or one.
                     // It's one only if this letter is at the beginning of
                     // one of the words.  The max is a little more
                     // complicated.  It is the maximum that the summands in
                     // this column can add up to plus the maximum carry
                     // from the next column minus the needed carry times
                     // the base here.

                     min_value[curr_char] = zero_or_one_start[curr_char];
                     max_possible = max_carry[curr_column + 1] +
                                    max_digit * column_lengths[curr_column] -
                                    needed_carry[curr_column] * base;
                     max_value[curr_char] = min_of_two(max_digit, max_possible);

                     DBG_SOLVE(
                        printf("range chosen [%d-%d] ", min_value[curr_char], max_value[curr_char]);
                     );

                     // Find the first available value in this range.  If there
                     // aren't any available, then we will backtrack.

                     value = min_value[curr_char];
                     while(value <= max_value[curr_char] &&
                           letter_map[value] != '\0') {
                        value++;
                     }

                     if(value > max_value[curr_char]) {

                        // We didn't find an available number in the range so
                        // we want to backtrack from here.

                        backtrack = 1;
                        backtrack_count++;

                        DBG_SOLVE(
                           printf("none available.\n");
                        );

                     } else {

                        backtrack = 0;
                        map_count[curr_char]++;
                        letter_map[value] = curr_char;
                        number_map[curr_char] = value;

                        DBG_SOLVE(
                           printf("using %d\n", value);
                        );
                     }
                  } // else
               } // else
            } // else

            // Okay, we've come to this sum character either by backtracking
            // or not and we've decided what to do from here.  Now we check
            // how the backtracking flag is set now to determine where to
            // go from here.  We make sure needed_sum is updated appropriately.

            if(backtrack) {

               // Move to the previous column and set to the summand with
               // index zero.  We set needed_sum to what the code for a
               // summand will expect.  We need to to check for a column
               // without summands

               needed_sum = needed_carry[curr_column];
                        DBG_SOLVE(
                           printf("Backtrack set need_sum=%d for %d\n", needed_sum,curr_column);
                        );
               curr_column--;
               if(curr_column == -1 || column_lengths[curr_column] == 0) {
                  curr_smnd_row = -1;
               } else {
                  curr_smnd_row = 0;
               }

            } else {

               // Move on to the highest index summand in this column, and
               // compute the needed sum.  Also do some bookkeeping.

               curr_smnd_row = column_lengths[curr_column] - 1;
               needed_sum = value + base * needed_carry[curr_column];

               DBG_SOLVE(
                  printf("Move on set needed_sum=%d with value=%d carry=%d on %d\n",needed_sum,value,needed_carry[curr_column],curr_column );
               );

               // Check for no summands here.  If there aren't any,
               // curr_smnd_row will be set to -1 and we will skip the
               // summand work below and move directly to the next sum
               // character.  We have to update the needed carry for
               // the new column in this case.

               if(curr_smnd_row < 0) {
                  curr_column++;
                  needed_carry[curr_column] = needed_sum;
                  DBG_SOLVE(
                        printf("Set needed_carry[%d]=%d on %d\n", curr_column, needed_sum, curr_smnd_row);
                     );
                  continue;
               }
            }
         } // else

         // We now have a summand to look at.  The variable curr_column
         // indicates the column of the puzzle we're working on and the
         // variable curr_smnd_row indicates the specific summand letter
         // from zero to the number of summands minus one.  The other
         // relevant value here is needed_sum, which indicates the sum
         // required for the summands from this one up to index zero and
         // the carry from the next column.

         // First check if we've backtracked off the left end, in which
         // case we've checked all possibilities.

         if(curr_column == -1) {
            break;
         }

         // See if we're done.  If we've gone through all of the possibilities
         // for the first sum character, then we've tried it all.

         while(curr_smnd_row >= 0) {

            curr_char = summand_char(curr_smnd_row, curr_column);

            DBG_SOLVE(
               if(backtrack) {
                  printf("Back");
               } else {
                  printf("Forward");
               }
               printf(" to summand char %c(%d)...", curr_char, curr_column);
            );

            // We need to see whether we came to the current character
            // moving forward or backtracking.

            if(backtrack) {

               // We backtracked here.

               if(map_count[curr_char] == 1) {

                  // This was the first occurance of this character.  Since
                  // we've backtracked to here, try to find the next available
                  // number in the range.

                  value = number_map[curr_char];
                  needed_sum += value;
                  DBG_SOLVE(
                     printf("First Occurrance of %c needed_sum=%d increment by %d...",curr_char, needed_sum, value);
                  );                  
                  letter_map[value] = '\0';
                  do {
                     value++;
                  } while(value <= max_value[curr_char] &&
                          letter_map[value] != '\0');

                  if(value > max_value[curr_char]) {

                     // We didn't find an available number in the range so
                     // we want to backtrack from here.

                     backtrack = 1;
                     backtrack_count++;
                     map_count[curr_char]--;

                     DBG_SOLVE(
                        printf("no more values in range.\n");
                     );

                  } else {

                     // Go forward with this new value.

                     backtrack = 0;
                     letter_map[value] = curr_char;
                     number_map[curr_char] = value;

                     DBG_SOLVE(
                        printf("next value in range: %d\n", value);
                     );

                  }

               } else {

                  // Since there is another one of these characters mapped
                  // behind us, we can't change the mapping here.  We want
                  // to backtrack.

                  backtrack = 1;
                  map_count[curr_char]--;
                  needed_sum += number_map[curr_char];

                  DBG_SOLVE(
                     printf("previously mapped character. needed_sum=%d increment by %d of %c\n", needed_sum, number_map[curr_char], curr_char);
                  );
               }
            } else {

               // We are to move forward.

               if(map_count[curr_char]) {

                  // A value has already been chosen for this character.  Use
                  // it and move on.

                  value = number_map[curr_char];

                  // See if this value is too big or not.

                  if(value > needed_sum) {

                     backtrack = 1;
                     backtrack_count++;

                     DBG_SOLVE(
                        printf("previously chosen value %d too large\n", value);
                     );

                  } else {
                     map_count[curr_char]++;
                     backtrack = 0;

                     DBG_SOLVE(
                        printf("previously chosen value %d\n", value);
                     );
                  }

               } else {

                  // Here no value has been chosen for this letter.  We
                  // will determine the range of values that might work
                  // for it and choose the first available to try.

                  min_possible = needed_sum - max_digit * curr_smnd_row -
                                 max_carry[curr_column + 1];
                  min_value[curr_char] = max_of_two(min_possible,
                                              zero_or_one_start[curr_char]);
                  max_value[curr_char] = min_of_two(max_digit, needed_sum);

                  DBG_SOLVE(
                     printf("range chosen [%d-%d] ", min_value[curr_char], max_value[curr_char]);
                  );

                  // Find the first available value in this range.  If there
                  // aren't any available, then we will backtrack.

                  value = min_value[curr_char];
                  while(value <= max_value[curr_char] &&
                        letter_map[value] != '\0') {
                     value++;
                  }

                  if(value > max_value[curr_char]) {

                     // We didn't find an available number in the range so
                     // we want to backtrack from here.

                     backtrack = 1;
                     backtrack_count++;

                     DBG_SOLVE(
                        printf("none available.\n");
                     );

                  } else {

                     backtrack = 0;
                     map_count[curr_char]++;
                     letter_map[value] = curr_char;
                     number_map[curr_char] = value;

                     DBG_SOLVE(
                        printf("using %d\n", value);
                     );
                  }
               } // else
            } // else

            // Now that we have decided whether we're moving forward
            // from here or backtracking, do the appropriate things.

            if(backtrack) {

               if(curr_smnd_row == column_lengths[curr_column] - 1) {

                  // We've backtracked all the way back to the sum.
                  // Just break out of the summand loop and we'll
                  // look at the sum.

                  break;

               } else {

                  // Go to the previous summand.  Note that needed_sum
                  // has already been updated.

                  curr_smnd_row++;
               }

            } else {

               if(curr_smnd_row == 0) {

                  // Set our focus to the next column.  Record what
                  // carry we need from there to make the column we
                  // just finished work correctly.  Either we are
                  // done, or we will next work on the sum character
                  // in the next column.  We break out of the summand
                  // loop.

                  curr_column++;
                  DBG_SOLVE(
                        printf("Decrement needed_sum=%d by %d\n", needed_sum, value);
                     );
                  needed_sum -= value;
                  needed_carry[curr_column] = needed_sum;
                  DBG_SOLVE(
                        printf("Set needed_carry[%d]=%d with value=%d\n", curr_column, needed_sum, value);
                     );
                  break;

               } else {

                  // Go to the next summand, and adjust the needed_sum.

                  curr_smnd_row--;
                  DBG_SOLVE(
                        printf("Decrement2 needed_sum=%d by %d\n", needed_sum, value);
                     );
                  needed_sum -= value;
               }
            } // else
         } // while (summands)
      } // while (columns)

      // Get rid of the summands array if it was allocated.

    //   if(allocated_smnds_array) {
    //      delete [] reform_smnds;
    //   }

      // Return the number of solutions we found.  If we only cared if more
      // than one was found, we returned above.

      *difficulty = difficulty_conv(backtrack_count);
      return(solutions_found);
   }


int upcase_and_check_legality(
      char *string,        // The string to upcase and check.
      int  *string_length  // Return the length of the string here.
   )
   // This function will upcase the string passsed in as well as
   // checking to make sure it only contains letters and that it is no
   // longer than MAX_LEN.  Any leading or following whitespace will
   // be removed.  If there is a problem with the string, an
   // appropriate error message will be generated and zero will be
   // returned.  A good string results in this returning 1.
   {
      char  *ch_p = string;
      char  *ch1_p;
      int    length = strlen(string);
      char  *new_p;
      char  *new_str;
      int    result = 1;


      // Allocate space to copy the string into.  We don't just modify
      // it in place so that if we have to print an error message
      // the string is still in its original form.

      new_str = new char[length + 1];
      new_p = new_str;

      // Detect any leading whitespace and ignore it.

      while(*ch_p == ' ' || *ch_p == '\t') {
         ch_p++;
      }

      // Now move through the string upcasing any characters and insuring
      // that all characters are alphabetic.  Copy them to the new string
      // as we go.

      while(*ch_p != '\0' && *ch_p != ' ' && *ch_p != '\t') {

         // Check for bad character.

         if(result && !isalpha(*ch_p)) {
            printf("Words must contain only letters.  Problem with: %s\n", string);
            result = 0;
         }

         // Upcase this character.

         *new_p++ = toupper(*ch_p++);
      }

      // If there is whitespace, it's either at the end of the string
      // and we'll just ignore it or it's in the middle, in which case
      // it's an error.  Search for the first non-whitespace character.

      ch1_p = ch_p;
      while(*ch_p == ' ' || *ch_p == '\t') {
         ch_p++;
      }

      // If we found a null, all is okay.  Put a null at the end of
      // the string.  Note that if there was no whitespace at the end,
      // this is a no-op.  Report an error if we didn't find a null.

      *new_p = '\0';
      if(result && *ch_p != '\0') {
         printf("Words must contain only letters.  Problem with: %s\n", string);
         result = 0;
      }

      // Check the length of the string and report an error if too long.

      length = new_p - new_str;
      if(new_p - new_str > MAX_LEN) {
         printf("Words can't be longer than %d characters.  %s is too long.\n", MAX_LEN, string);
         result = 0;
      }

      // Now copy the upcased string back to the one passed in, delete
      // the allocated memory, and return the result.

      strcpy(string, new_str);
      delete [] new_str;
      *string_length = length;
      return(result);
   }


unsigned int look_for_puzzles_specific_count(
      char         **words,
      int            word_count,
      int            base,
      int           *word_lengths,
      int           *bit_count,
      int           *letters_used,
      int            summand_count,
      int            exactly_one,
      int            disallow_rep,
      int            first_sum_only,
      unsigned int  *search_count
   )
   // This function will look for puzzles with solutions (one or many)
   // given the list of words and the various information about them
   // in the other parameters.  This function returns the number of
   // good puzzles found.  It also returns the number searched in the
   // parameter search_count.
   {
      int           backtrack;
      int           difficulty;
      unsigned int  good_puzzles = 0;
      int           i;
      int           index_limit;
      int           letter_map;
      int          *longest_smnd;
      int           new_letter_map;
      unsigned int  puzzles_tried = 0;
      int           smnd_index;
      int          *smnd_word_index;
      int          *smnd_word_lengths;
      char        **smnd_word_ptrs;
      int          *smnd_letter_map;
      int           solutions;
      char         *sum;
      int           sum_index;
      int           sum_index_limit;
      int           sum_length;
      int           total_letters;
      int           try_ind;


      // Allocate arrays for summands.

      longest_smnd = new int[summand_count];
      smnd_word_index = new int[summand_count];
      smnd_word_ptrs = new char*[summand_count];
      smnd_word_lengths = new int[summand_count];
      smnd_letter_map = new int[summand_count];

      // Try each word as the sum.

      sum_index_limit = (first_sum_only) ? 1 : word_count;
      for(sum_index = 0; sum_index < sum_index_limit; sum_index++) {
         sum = words[sum_index];
         sum_length = word_lengths[sum_index];

         DBG_FIND(
            printf("Sum is %s\n", sum);
         );

         // Find summand_count words other than sum such that
         // no more than base characters are used and all of
         // the summand words are not longer than the sum's length.

         smnd_index = 0;
         backtrack  = 0;
         while(smnd_index >= 0) {

            // See if we have a possible set of summands.

            if(smnd_index == summand_count) {

               // We have a set of words to try.

               solutions = solve(smnd_word_ptrs, summand_count,
                     smnd_word_lengths, longest_smnd[smnd_index - 1], sum,
                     base, 0, 0, &difficulty);
               puzzles_tried++;

               DBG_FIND(
                  printf("  Trying ");
                  for(i = 0; i < summand_count; i++) {
                     if(i != 0) {
                        printf(" + ");
                     }
                     printf("%s", smnd_word_ptrs[i]);
                  }
                  printf("\n");
               );

               // If one solution was returned, then we want to print
               // this one.  Note that this is the correct thing to do
               // whether we were looking for puzzles with exaclty one
               // solution or not.

               if(solutions == 1 || (solutions > 0 && !exactly_one)) {
                  good_puzzles++;
                  if(!exactly_one) {
                     printf("(%d) ", solutions);
                  }
                  for(i = 0; i < summand_count; i++) {
                     if(i != 0) {
                        printf(" + ");
                     }
                     printf("%s", smnd_word_ptrs[i]);
                  }
                  letter_map = smnd_letter_map[smnd_index - 1];
                  total_letters = bit_count[letter_map & 0x1ff]
                    + bit_count[(letter_map >> 9) & 0x1ff]
                    + bit_count[(letter_map >> 18) & 0x1ff];
                  printf(" = %s", sum);

                  if(DIFF_PRINT) {
                     printf("  difficulty: %d", difficulty);
                  }
                  printf("\n");
               }

               // Backtrack from here to try another.

               backtrack = 1;
               smnd_index--;
               continue;

            } else {

               if(backtrack) {

                  // We've backtracked to this position in the summand array.
                  // Try to find a new index for this position after
                  // the one here currently.

                  try_ind = smnd_word_index[smnd_index] + 1;

               } else {

                  // We've come to this position in the summand array
                  // going forward.  Starting at the start of the word
                  // array, find one for this spot in the summands array.

                  try_ind = (smnd_index == 0) ? 0
                          : smnd_word_index[smnd_index - 1] + disallow_rep;
               }

               // Now look for a possible word starting at the index try_ind.
               // We stop when we reach either word count in the case where
               // repetition of words is allowed or the number of sumands
               // left subtracted from word_count where repetition isn't
               // allowed.

               if(disallow_rep) {
                  index_limit = (word_count -
                                     (summand_count - smnd_index - 1));
               } else {
                  index_limit = word_count;
               }
               while(try_ind < index_limit) {

                  // The sum can't be included in the summands.

                  if(try_ind == sum_index) {
                     try_ind++;
                     continue;
                  }

                  // A summand can't be longer than the sum.

                  if(word_lengths[try_ind] > sum_length) {
                     try_ind++;
                     continue;
                  }

                  // See how many total letters there will be after we
                  // add this word.  If there are more than base, there
                  // can't be a solution.

                  new_letter_map = (smnd_index == 0)
                    ? letters_used[sum_index] | letters_used[try_ind]
                    : smnd_letter_map[smnd_index - 1]
                      | letters_used[try_ind];
                  total_letters = bit_count[new_letter_map & 0x1ff]
                    + bit_count[(new_letter_map >> 9) & 0x1ff]
                    + bit_count[(new_letter_map >> 18) & 0x1ff];
                  if(total_letters > base) {
                     try_ind++;
                     continue;
                  }

                  // This one looks okay.

                  break;
               }

               // See if we found a summand word to try in this place.
               // If not, backtrack.  If so, go to next summand spot.

               if(try_ind >= index_limit) {

                  backtrack = 1;
                  smnd_index--;

               } else {

                  // When we go forward, we have to keep track of the
                  // index into the words array this summand is, its
                  // lengths, a pointer to the word, and the bit map
                  // of letters used to this point.

                  backtrack = 0;
                  smnd_word_index[smnd_index] = try_ind;
                  smnd_word_ptrs[smnd_index] = words[try_ind];
                  smnd_word_lengths[smnd_index] = word_lengths[try_ind];
                  smnd_letter_map[smnd_index] = new_letter_map;
                  if(smnd_index == 0) {
                     longest_smnd[smnd_index] = word_lengths[try_ind];
                  } else {
                    if(word_lengths[try_ind] >
                                     longest_smnd[smnd_index - 1]) {
                       longest_smnd[smnd_index] = word_lengths[try_ind];
                    } else {
                       longest_smnd[smnd_index] =
                                     longest_smnd[smnd_index - 1];
                    }
                  }

                  // Set index to next summand space.

                  smnd_index++;
               }
            }
         }
      }

      // Now free the arrays we allocated.

      delete [] smnd_word_index;
      delete [] smnd_word_ptrs;
      delete [] smnd_word_lengths;
      delete [] smnd_letter_map;
      delete [] longest_smnd;

      // Return the number of good puzzles found and the number tried.

      *search_count = puzzles_tried;
      return(good_puzzles);
   }


unsigned int look_for_puzzles(
      char         **words,
      int            word_count,
      int           *word_lengths,
      int            base,
      int            low_summand_count,
      int            high_summand_count,
      int            exactly_one,
      int            disallow_rep,
      int            first_sum_only,
      unsigned int  *total_searched
   )
   // This function will look for puzzles with solutions using the words
   // given.  It will search for them among all possible combinations
   // from low_summand_count to high_summand_count summands.  If
   // exactly_one is set, then it will only generate puzzles that have
   // exactly one solution.  Otherwise it will generate puzzles that
   // have at least one solution.
   {
      int           bit_count[512];
      int           bits;
      char          ch;
      int           i;
      int           j;
      int           length;
      int          *letters_used;
      unsigned int  number_found = 0;
      unsigned int  search_count;
      int           summand_count;


      // Initialize search count.

      *total_searched = 0;

      // First fill in the bit_count array.  This holds the number
      // of set bits in the the index number.  This could be made static.

      for(i = 0; i < 512; i++) {
         bits = 0;
         for(j = 0; j < 9; j++ ) {
            bits += ((i >> j) & 0x1);
         }
         bit_count[i] = bits;
      }

      // Determine the letters used by each word.

      letters_used = new int[word_count];
      for(i = 0; i < word_count; i++) {
         letters_used[i] = 0;
         for(j = 0; j < word_lengths[i]; j++) {
            letters_used[i] |= (1 << (words[i][j] - 'A'));
         }
      }

      // Now go through the different summand counts.

      for(summand_count = low_summand_count;
          summand_count <= high_summand_count;
          summand_count++) {

         // Now call the function that looks for puzzles with a
         // specific number of summands.

         number_found += look_for_puzzles_specific_count(words,
                            word_count, base, word_lengths,
                            bit_count, letters_used, summand_count,
                            exactly_one, disallow_rep, first_sum_only,
                            &search_count);
         *total_searched += search_count;
      }

      // Get rid of the arrays we allocated.

      delete [] letters_used;

      return(number_found);
   }


void print_usage()
   {
      printf("This program will solve and search for alphametic puzzles involving\n");
      printf("addition.  An alphametic puzzle is an equation involving words where a\n");
      printf("substitution of digits for letters can be found so that the equation\n");
      printf("comes out correctly.  For example the alphametic (I + BB = ILL) can be\n");
      printf("solved in only one way.  That solution is I = 1, B = 9, and L = 0.\n");
      printf("Each digit can only substitute for one letter, and all of a specific\n");
      printf("letter must be substituted by the same digit.  The left-most letter in\n");
      printf("a word can never be substituted for by zero.\n");
      printf("\n");
      printf("To solve a known alphametic puzzle using this program the -solve\n");
      printf("option is used.  Either the whole puzzle is given on the command line\n");
      printf("or it and the base are prompted for later.\n");
      printf("\n");
      printf("    swp -solve\n");
      printf("\n");
      printf("The program will ask for the base to solve the puzzle in (almost\n");
      printf("always 10).  It will then ask for the summand words to be input and\n");
      printf("finally the sum.  If the base used is to be 10, then the command line\n");
      printf("alone can be used as:\n");
      printf("\n");
      printf("    swp -solve {summands} sum\n");
      printf("\n");
      printf("  where any number of summands are given separated by spaces.\n");
      printf("\n");
      printf("To search for alphametic puzzles among a list of words the -find\n");
      printf("option is used.  Once again, either just the command line can be used\n");
      printf("or the words and other options can be prompted for.\n");
      printf("\n");
      printf("    swp -find\n");
      printf("\n");
      printf("The program will ask for the base to use and the minimum and maximum\n");
      printf("number of summands in a puzzle.  It will then ask if it should report\n");
      printf("puzzles with duplicate words and if it should only report puzzles with\n");
      printf("exactly one solution.\n");
      printf("\n");
      printf("Just the command line may be used if the base to use is 10 and\n");
      printf("duplicates are allowed and only puzzles with exactly one solution are\n");
      printf("wanted.  The syntax for command line invokation is:\n");
      printf("\n");
      printf("    swp -find {words}\n");
      printf("\n");
      printf("Summary of usage:\n");
      printf("  'swp -solve {summands} sum'  Solve puzzle in base 10.\n");
      printf("  'swp -solve' Solve a puzzle.  Prompt for base, summands, and sum.\n");
      printf("  'swp -find {words}'  Look for puzzles.  Base 10.  Duplication & one solution.\n");
      printf("  'swp -find'  Look for puzzles.  Prompt for words and info.\n");
      printf("  'swp -usage' Generates this usage message.\n");
      printf("  'swp -help'  Generates this usage message.\n");
   }



char **read_words(
      int  *word_count,
      int  *longest_word_length,
      int **lengths,
      int  *error
   )
   {
      char        ch;
      char       *ch_p;
      const int   chunk_size = 20;
      int         curr_word_index = 0;
      int         i;
      char        in_string[200];
      int         last_char_ind;
      int         word_array_size = chunk_size;
      int        *word_lengths;
      char      **word_transfer;
      char      **words;


      *error = 0;
      words = new char*[word_array_size];
      while(1) {

         // Read a string.

         fgets(in_string, 200, stdin);
         last_char_ind = strlen(in_string) - 1;
         if(in_string[last_char_ind] == '\n') {
            in_string[last_char_ind] = '\0';
         }

         // Check for string WAY too long.  If the string didn't overflow,
         // the next character should be the newline.  Exit if there
         // was a problem.

         if(strlen(in_string) >= MAX_LEN) {
            printf("String was too long.  Limit is %d characters.\n", MAX_LEN);
            exit(1);
         }

         // Find the first non-whitespace character.  If it's null, then
         // we're done.

         ch_p = in_string;
         while(*ch_p == ' ' || *ch_p == '\t') {
            ch_p++;
         }

         // If this is the empty string, then we are done.

         if(strcmp(ch_p, "") == 0) {
            break;
         }

         // Make sure there's room for the string.  If not,
         // allocate a new array somewhat bigger and copy the
         // old one over.  Do the same for the lengths array.

         if(curr_word_index == word_array_size) {
            word_array_size += chunk_size;
            word_transfer = new char*[word_array_size];
            for(i = 0; i < curr_word_index; i++) {
               word_transfer[i] = words[i];
            }
            delete [] words;
            words = word_transfer;
         }

         // Allocate space for the string and copy it in.

         words[curr_word_index] = new char[strlen(in_string) + 1];
         strcpy(words[curr_word_index], in_string);
         curr_word_index++;
      }

      // Check for errors in the strings read in.  Set error flag
      // if errors found.  While we're at it, get the lengths.

      word_lengths = new int[curr_word_index];
      *longest_word_length = 0;
      for(i = 0; i < curr_word_index; i++) {
         if(!upcase_and_check_legality(words[i], &word_lengths[i])) {
            *error = 1;
         }
         if(word_lengths[i] > *longest_word_length) {
            *longest_word_length = word_lengths[i];
         }
      }

      // Return the number of words and the array they're in.

      *word_count = curr_word_index;
      *lengths = word_lengths;
      return(words);
   }


int main(int argc, char *argv[])
   {
      int           bad_input;
      int           base = 10;
      char          ch;
      int           curr_summand_index;
      int           curr_word_index;
      int           difficulty;
      int           disallow_rep;
      long          elapsed_time;
      long          end_time;
      int           error;
      int           exactly_one;
      int           first_sum_only;
      int           i;
      char          in_string[200];
      int           j;
      int           last_char_ind;
      int           longest_summand;
      int           longest_word;
      int           max_summands;
      int           min_summands;
      unsigned int  number_found;
      long          start_time;
      char         *sum;
      int           sum_length;
      int           summand_count;
      int          *summand_lengths;
      char        **summands;
      unsigned int  total_searched;
      int           word_count;
      int          *word_lengths;
      char        **words;


      // If no arguments are given, or usage is requested,
      // print usage info and exit.

      if(argc == 1 || strcmp(argv[1], "-usage") == 0
                   || strcmp(argv[1], "-help") == 0) {
         print_usage();
         return(0);
      }

      // See if we are to solve a puzzle.

      if(strcmp(argv[1], "-solve") == 0) {

         if(argc >= 4) {

            // Allocate an array of pointers to the strings passed in as well
            // as an array of integers that are the lengths of these string.

            summand_count = argc - 3;
            summands = new char*[summand_count];
            summand_lengths = new int[summand_count];

            // Get the summands first then the sum.  For each, make sure it
            // doesn't have illegal characters.

            bad_input = 0;
            longest_summand = 0;
            for(i = 0; i < summand_count; i++) {
               summands[i] = argv[i + 2];
               if(!upcase_and_check_legality(summands[i],
                                             &summand_lengths[i])) {
                  bad_input = 1;
               }
               if(summand_lengths[i] > longest_summand) {
                  longest_summand = summand_lengths[i];
               }
            }
            sum = argv[argc - 1];
            if(!upcase_and_check_legality(sum, &sum_length)) {
               bad_input = 1;
            }

            // Call the routine to look for solutions and print them
            // unless there were errors in the input.

            if(!bad_input) {
               solve(summands, summand_count, summand_lengths,
                     longest_summand, sum, base, 1, 0, &difficulty);
               if(DIFF_PRINT) {
                  printf("Difficulty: %d\n", difficulty);
               }
            }

            // Free the two allocated arrays and leave.

            delete [] summands;
            delete [] summand_lengths;
            return(bad_input);

         } else {

            // We need to prompt for the information from the user.

            // Get the base to solve the puzzle in.

            do {
               printf("Input the base to solve the puzzle in (2 to 16).\n");
               scanf("%d", &base);
               getchar();
            } while(base < 2 || base > 16);

            // Get the summands.

            printf("Input summands one per line.  Press return when done.\n");
            summands = read_words(&summand_count, &longest_summand,
                                  &summand_lengths, &error);

            // If there wasn't an error with the summands, go ahead and
            // get the sum.

            if(!error) {

               // Now get the sum.

               printf("\nInput the sum.\n");
               fgets(in_string, 200, stdin);
               last_char_ind = strlen(in_string) - 1;
               if(in_string[last_char_ind] == '\n') {
                  in_string[last_char_ind] = '\0';
               }
               if(strlen(in_string) >= MAX_LEN) {
                  printf("Sum string was too long.\n");
                  error = 1;
               }
               sum = in_string;

               // If the sum was made of legal characters, look for solutions.

               if(!error &&
                       upcase_and_check_legality(in_string, &sum_length)) {

                  // Call the routine to look for solutions and print them.

                  solve(summands, summand_count, summand_lengths,
                        longest_summand, sum, base, 1, 0, &difficulty);
                  if(DIFF_PRINT) {
                     printf("Difficulty: %d\n", difficulty);
                  }
               }
            }

            // Free allocated memory and leave.

            for(i = 0; i < summand_count; i++) {
               delete [] summands[i];
            }
            delete [] summands;
            delete [] summand_lengths;
            return(error);
         }
      }

      // See if we are to look for solutions among a list of words.

      if(strcmp(argv[1], "-find") == 0) {

         // See if they put the words on the command line.

         if(argc >= 4) {

            // Get the words.

            word_count = argc - 2;
            words = new char*[word_count];
            word_lengths = new int[word_count];

            // Get the words, determine the lengths of them and check them
            // for illegal characters.

            error = 0;
            for(i = 0; i < word_count; i++) {
               words[i] = argv[i + 2];
               if(!upcase_and_check_legality(words[i], &word_lengths[i])) {
                  error = 1;
               }
            }

            if(!error) {

               // Note the time we started looking.

               time(&start_time);

               // Call the routine that looks for puzzles with solutions.
               // Use 2 and the number of words - 1 for the min and max
               // summands.

               number_found = look_for_puzzles(words, word_count, word_lengths,
                                base, 2, word_count - 1, 1, 0, 0,
                                &total_searched);
            }

            delete [] word_lengths;
            delete [] words;

         } else {

            // We need to prompt for the information from the user.

            // Get the base to solve the puzzle in and the min and max
            // number of summands.

            do {
               printf("Input the base to solve the puzzle in (2 to 16).\n");
               scanf("%d", &base);
               getchar();
            } while(base < 2 || base > 16);

            printf("Input the minimum number of summands.\n");
            scanf("%d", &min_summands);
            getchar();

            printf("Input the maximum number of summands.\n");
            scanf("%d", &max_summands);
            getchar();

            printf("Disallow repetition of summands (Y or N)?\n");
            scanf("%c", &ch);
            getchar();
            if(ch == 'y' || ch == 'Y') {
               disallow_rep = 1;
            } else {
               disallow_rep = 0;
            }

            printf("Only puzzles with one solution(Y or N)?\n");
            scanf("%c", &ch);
            getchar();
            if(ch == 'y' || ch == 'Y') {
               exactly_one = 1;
            } else {
               exactly_one = 0;
            }

            printf("Use only the first word for the sum(Y or N)?\n");
            scanf("%c", &ch);
            getchar();
            if(ch == 'y' || ch == 'Y') {
               first_sum_only = 1;
            } else {
               first_sum_only = 0;
            }

            // Get the words to search for valid puzzles with.

            printf("Input words one per line.  Press return when done.\n");
            words = read_words(&word_count, &longest_word,
                               &word_lengths, &error);

            // If there wasn't an error, then go ahead and look for puzzles.

            if(!error) {

               // Note the time we started looking.

               time(&start_time);

               // Call the routine that looks for puzzles with solutions.

               number_found = look_for_puzzles(words, word_count, word_lengths,
                                base, min_summands, max_summands, exactly_one,
                                disallow_rep, first_sum_only, &total_searched);

            }

            // Free allocated memory.

            for(i = 0; i < word_count; i++) {
               delete [] words[i];
            }
            delete [] word_lengths;
            delete [] words;
         }

         if(!error) {

            // See how long the search took.

            time(&end_time);
            elapsed_time = end_time - start_time;
            printf("Elapsed time was %ld seconds.\n", elapsed_time);
            printf("Found %d good puzzles after searching %d\n", number_found, total_searched);
         }
      }

      return(error);
   }