---
applyTo: "**"
---

# Rowguide Debugging & Testing - LLM Agent Instructions

## Testing Protocol (Critical)

### Manual Testing Requirements

- **Provide specific testing steps** for user to validate changes
- **Explain assumptions and intent** clearly before requesting tests
- **No change is complete** without manual testing validation
- **Don't assume you know the solution to the problem** without validating it

### Testing Workflow

1. Make code modifications
2. Explain expected behavior and assumptions
3. Request specific testing steps from user
4. Iterate based on feedback
5. Confirm requirements met before completion

## Debugging Tools

### Git Analysis

```bash
git diff                    # Current changes vs last commit
git diff main              # All changes since main branch
git stash                  # Separate changes into focused commits
```

### Command Output Management

- **NEVER use head, tail, or pipes** to limit command output length
- **If output might be long**, save to temporary file and read back:

```bash
# ❌ Don't do this:
yarn test | head -50

# ✅ Do this instead:
yarn test > test-output.txt
# Then use read_file tool to examine test-output.txt
```

### When to Ask for Help

- Encountering issues or unclear requirements
- Need clarification on expected behavior
- Require validation of assumptions before proceeding
- Changes didn't have the intended effect

## Debugging Methodology (Critical)

### Evidence-Based Investigation

- **NEVER assume you know the cause** of a problem without investigating
- **Read actual error messages and output** - don't pattern match to familiar issues
- **Observe before theorizing** - gather facts before forming hypotheses
- **Test one thing at a time** - avoid making multiple changes simultaneously

### Prohibited Debugging Patterns

- **Jumping to conclusions**: Making assumptions about root cause without evidence
- **Confirmation bias**: Looking for evidence that supports preconceived notions
- **Pattern matching**: Assuming similar symptoms mean same root cause
- **Solution shopping**: Trying random fixes without understanding the problem

### Required Debugging Process

1. **Observe the facts**: What exactly is happening vs expected?
2. **Read the evidence**: Error messages, logs, actual test output
3. **Form specific hypotheses**: Based on observed evidence only
4. **Test hypotheses systematically**: One change at a time
5. **Validate results**: Confirm hypothesis before moving to next step
