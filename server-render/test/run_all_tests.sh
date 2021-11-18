#!/bin/bash

scenarios="scenarios/*"

for scenarioName in $scenarios
do
	./run_scenario.sh $(basename "$scenarioName")
  if [ $? -ne 0 ]; then
    echo "** Test failed for scenario: $scenarioName"
    exit 1
  fi
done

echo "All test scenarios passed."
