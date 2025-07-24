---
applyTo: "**"
---

# Rowguide Debugging & Testing - LLM Agent Instructions

## Testing Protocol (Critical)

### Manual Testing Requirements
- **ALWAYS request manual testing** after code changes (no E2E tests available)
- **Provide specific testing steps** for user to validate changes
- **Explain assumptions and intent** clearly before requesting tests
- **No change is complete** without manual testing validation

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
yarn test > /tmp/test-output.txt
# Then use read_file tool to examine /tmp/test-output.txt
```

### When to Ask for Help
- Encountering issues or unclear requirements
- Need clarification on expected behavior
- Require validation of assumptions before proceeding
- Changes didn't have the intended effect