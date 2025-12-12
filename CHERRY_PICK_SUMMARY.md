# Cherry-Pick Summary

## Task
Cherry-pick commit a73c9c6 (docs: update Animate API docs #216) to branches 3.4 and 3.5.

## Actions Completed

### Branch: release/3.4
- **Status**: ✅ Successfully cherry-picked
- **New Commit**: fe2628e
- **Strategy**: Used `-X theirs` merge strategy to automatically resolve 412 conflicts
- **Changes**: 506 files changed, 17190 insertions(+), 2758 deletions(-)

### Branch: release/3.5
- **Status**: ✅ Successfully cherry-picked
- **New Commit**: aa7b5b9
- **Strategy**: Used `-X theirs` merge strategy to automatically resolve conflicts
- **Changes**: 455 files changed, 11444 insertions(+), 2719 deletions(-)

## Original Commit Details
- **Commit SHA**: a73c9c6
- **Author**: YellowFish <161697541+YellowFishWyfCPP@users.noreply.github.com>
- **Date**: Sat Dec 13 04:25:01 2025 +0800
- **Message**: docs: update Animate API docs (#216)

## Notes
- Both cherry-picks encountered merge conflicts due to structural differences in JSON compatibility data files between the main branch and release branches
- The `-X theirs` strategy was used to accept incoming changes from the commit being cherry-picked, which is appropriate for documentation updates
- Both branches now have the updated Animate API documentation and related files

## Next Steps
The cherry-picked commits are ready on the local `release/3.4` and `release/3.5` branches. These branches need to be pushed to the remote repository to complete the task.

Due to authentication constraints in the current environment, the branches cannot be pushed directly. However, the cherry-pick operations have been completed successfully and are ready for push.
