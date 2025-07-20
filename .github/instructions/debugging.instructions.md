---
applyTo: "**"
---

# Rowguide Debugging & Testing Workflow Guide

## Manual Testing Requirements

- When debugging or making changes, remember to ask me to test the application with specific steps to verify the changes. We don't have E2E tests, so manual testing is essential.
- I will confirm the intent of a change while manual testing and provide feedback on whether it meets the requirements, so please provide clear and concise explanations of your assumptions about the intent behind a change or feature.

## Debugging Workflow

- If you encounter any issues or have questions, feel free to ask for clarification or assistance.
- If you need to see what state the code was in before your changes, you can use the `git diff` command to compare the current state with the previous commit. This will help you understand what has changed and ensure that your modifications are correct.

## Collaborative Testing Process

1. **Code Changes**: Make necessary code modifications
2. **Explain Intent**: Provide clear explanations of assumptions and expected behavior
3. **Manual Testing**: Request specific testing steps for validation
4. **Feedback Loop**: Iterate based on testing results and user feedback
5. **Verification**: Confirm changes meet requirements before completion

## Git-Based Debugging

- Use `git diff` to understand changes between current state and previous commits
- Use `git diff main` to see all changes since the main branch
- Use git stash strategically to separate different types of changes into focused commits
