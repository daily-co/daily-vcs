#!/bin/bash

scenarios=( "hello" )

for scenarioName in "${scenarios[@]}"
do
	./run_scenario.sh "$scenarioName" "scenarios/$scenarioName"
  if [ $? -ne 0 ]; then
    echo "** Test failed for scenario: $scenarioName"
    exit 1
  fi
done

echo "All test scenarios passed."
