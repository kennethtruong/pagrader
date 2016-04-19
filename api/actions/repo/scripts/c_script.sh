#!/bin/bash
#Script for grading C programs (CSE 5)
#Usage: ./c_script.sh <Optional Bonus Due Date>
#Example: ./c_script.sh "01/24/2015 15:00"
red="\033[1;31m"
green="\033[1;32m"
blue="\033[1;34m"
clear="\033[0m"

#Enable bash's nullglob setting so that pattern *.c will expand to empty string if no such files
shopt -s nullglob

#Check if bonus date specified
if [[ -n $1 ]]; then
  # Bonus date change 15:00 if different time
  bonus=$(date +'%s' -d "${1}")
else
  # NO bonus dates so just setting artbitrary date in past
  bonus=$(date +'%s' -d "01/24/1991 15:00:00.000")
fi


if [ ! -e "input.txt" ]; then
  echo -en "Error: Missing file: \"input.txt\""
  exit -1
fi

prt=(*.prt)
if test ${#prt[@]} -ne 1; then
  echo -en "Error: Missing PA prt file: \"PA#.prt\""
  exit -1
else
  #Parse PA#.prt for output (We are looking for a line that starts with .output)
  awk -v regex="[A-z]*.output" '$0 ~ regex {seen = 1}
     seen {print}' $prt > output.html
fi

# This file helps keeps store all the students that turned in their assignment early for bonus
if [ -e bonusList ]; then
  rm bonusList
fi
# Variable to keep track of bonus list
bonuslist=""

repos=(*/)
for dir in ${repos[@]}; do
  cp input.txt output.html $prt $dir
  cd $dir

  assignments=(*.c)
  # Get filenames
  if test ${#assignments[@]} -le 0; then
    continue
  else
    echo $dir
  fi

  for assignment in ${assignments[@]}; do
    ed -s $assignment <<< $'H\ng/\r*$/s///\nwq' # dos2unix equivalent
    cat $assignment > ${assignment:0:6}.html
    # This is to make sure that their programs have the stdlib.h since students don't check that it
    # works on the linux machines and turn in without running it
    echo '#include <stdlib.h>' | cat - $assignment > temp && mv temp $assignment
  done

  # Remove all previous output
  if [ -e ${assignments[0]%.c}.out.html ] ; then
     rm *.out.html
  fi

  # Convert C code to HTML using VIM for display
  # for f in ${assignments[@]}; do
  #   vim -f +"syn on" +"colorscheme ron" +"TOhtml" +"wq" +"q" code
  #   mv code.html "${f%.c}.html"
  # done

  counter=0
  #Parse PA.prt file
  while read LINE
  do
    [ -z "$LINE" ] && continue
    #Find PA's info in PA.prt file for bonus date
    if [[ "$LINE" =~ "${assignments[${counter}]:0:6}" ]]
    then
      fname="${assignments[${counter}]:0:6}"

      # Convert bonus date of PA to seconds
      # Get date Each line in PA.prt has the turn in date on the 6th 7th 8th column
      filetime=$(date --date="$(echo $LINE | cut -d' ' -f6,7,8)" +%s)


      # Check for extra credit
      if [ $filetime -le $bonus ]; then
        bonuslist="${bonuslist}${fname}\n"
      fi

      #Compile and ignore warnings
      gcc -Werror ${assignments[${counter}]} &> $fname.out.html
      #Check if error
      if [ $? -ne 1 ]; then
        #Run program manually feeding input and printing out output in background process
        if [ -e input ]; then
          rm input
        fi

        cp input.txt temp

        inCount=$(wc -l < input.txt)
        test `tail -c 1 "input.txt"` && ((inCount++))
        count=0
        # Run until all input given
        while [ $count -lt $inCount ]
        do
          if [ -e input ]; then
             echo "<p class='alert alert-danger'>Program ended on last input... Restarting program...</p>" >> $fname.out.html
          fi

          if [ -e "strace.fifo" ]; then
            rm strace.fifo
          fi

          # This is the core of the script
          # This uses strace to help feed input
          # stdbuf -o0 helps flush input along with the output
          # perl -e "alarm 2; exec @ARGV" "./a.out" helps kills the process if it takes over 2 seconds
          inputFlag=false
          mkfifo strace.fifo
          {
            while read -d, trace; do
              if [[ $trace = *"read(0" ]] ; then
                IFS= read -rn1 answer <&3 || break
                answer=${answer:-$'\n'}
                printf "<font style='color: purple;'>$answer</font>" >> $fname.out.html
                printf "$answer" >> input
                diff -w -B input input.txt > /dev/null
                if [[ $? -eq 0 ]] ; then
                  # End of input
                  inputFlag=true
                fi
                printf %s "$answer"
              elif $inputFlag ; then
                killall -15 a.out > /dev/null 2>&1
              fi
            done < strace.fifo 3< temp | strace -o strace.fifo -e read stdbuf -o0 perl -e "alarm 2; exec @ARGV" "./a.out"
          } >> $fname.out.html 2>>error

          errorCode=$?
          #Check if the program was terminated
          if [[ $errorCode -eq 142 ]] ; then
            echo "<p class='alert alert-danger'>Program terminated because of infinite loop.\nPlease run their program manually or check their code.</p>" >> $fname.out.html
            rm error # Error is from infinite loop
            break
          elif [[ $errorCode -eq 143 ]] ; then
            printf "<p class='alert alert-danger'>Program terminated because it was waiting for more input than expected.\n(Note: This could mean they have getchar() at the end of their code.\nPlease run their program manually or check their code.)</p>" >> $fname.out.html
            rm error # Error is from running out of input
            break
          elif [ -s error ] ; then
            echo "<h2 class='alert alert-danger'>Runtime Error!</h2>" >> $fname.out.html
            cat error >> $fname.out.html
            rm error # Run time error
            break
          fi

          # Remove empty error files
          if [ -e error ] ; then
            rm error
          fi

          diff -w -B input input.txt > /dev/null
          if [ $? -eq 1 ] ; then
             test 'tail -c 1 "input"' && echo "" >> input
             count=$(wc -l < input)
             test `tail -c 1 "input"` && ((count++))
             tail -n $(expr ${count} - ${inCount}) input.txt > temp
          else
             rm strace.fifo
             break
          fi
        done

        if [ -e input ] ; then
          rm input
        fi

        rm temp a.out
      else  #Error while compiling
        echo "<h2 class='alert alert-danger'>Compile Error!</h2>" | cat - $fname.out.html > temp && mv temp $fname.out.html
      fi
      counter=$((counter+1))
      [ $counter -eq ${#assignments[@]} ] && break
    fi
  done < $prt

  if [ -e "strace.fifo" ]; then
    rm strace.fifo
  fi

  rm input.txt $prt
  cd ..
done

printf "${bonuslist}" >> bonusList
