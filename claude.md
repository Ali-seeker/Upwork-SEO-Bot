# Antigravity AI Agent Instructions

When performing any task, the AI agent MUST adhere to the following core instructions:

1. **Use the Brain for Exploration**: Whenever you need to search for something, find a file, or locate a specific function/code block, **DO NOT** explore the raw file structure directly. You must first read and explore the `brain.md` file to identify the relevant file(s). Once identified, navigate directly to that relevant location in the codebase.
2. **No Unauthorized GitHub Pushes**: Do not push anything to GitHub without explicit permission from the user. You may only push code if the user explicitly instructs you to do so.
3. **Command Execution Requires Permission**: Do not run any terminal commands (regardless of whether they are small, large, or related to any task) without first asking for and receiving the user's permission.
4. **Keep the Brain Updated**: Whenever you create a new file, remove an existing file, or add/modify a significant part of the codebase, you MUST update the `brain.md` file to reflect these changes every single time.
