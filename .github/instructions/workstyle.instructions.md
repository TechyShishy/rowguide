---
applyTo: "**"
---

- Always update the implementation checklist after making changes to the code to keep track of your progress and ensure all tasks are completed.
- Maintain a 100% pass rate for all relevant tests before considering the code change completed.
- Consistency is key: ensure that coding styles and conventions are the same throughout the codebase.
- Don't guess. Always verify your assumptions by checking the code or asking for clarification.
- Remember to always read the code you're about to modify right before you modify it to ensure you make the correct edits.
- Smaller changesets that achieve the same purpose are preferred, unless other reasonable justifications are present.
- Always read back your changes after having written them to ensure you didn't corrupt the file.
- The read -> write -> read cycle is crucial. Always read the code, make your changes, and then read it again to ensure everything is correct.
- Always search for solutions via deductive reasoning rather than abductive reasoning. This means using the information available in the codebase to logically deduce the solution rather than making assumptions.
- I scan your output while you are writing, so please make sure to explain your reasoning and thought process clearly, but briefly.
- Always surface your second and third hypotheses, not just the first one. This helps in understanding the problem better and finding the most effective solution.
- While developing e2e tests, run them only on one browser project at a time in order to minimize development time.  Once you've completed the tests for one browser, you can then run them across all browsers to ensure compatibility.
