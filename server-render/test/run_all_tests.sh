#!/bin/bash

scenarios="scenarios/*"

failed=false
for scenarioName in $scenarios
do
	./run_scenario.sh $(basename "$scenarioName")
  if [ $? -ne 0 ]; then
    echo "** "
    echo "** Test failed for scenario: $scenarioName"
    echo "** Will continue with other tests."
    echo "** "
    failed=true
  fi
done

if [ $failed = true ]; then
  echo "** Couldn't complete all test scenarios. See log for detail of failed test(s)."
  exit 1
fi
echo "All test scenarios passed."
