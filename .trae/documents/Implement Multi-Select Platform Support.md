I will implement multi-select platform support across the API Status components.

### 1. State Management (`APIStatusLayout.tsx`)

- Change `selectedPlatform` (single string) to `selectedPlatforms` (string array).

- Initialize with `['android', 'ios']` as the default.

- Update `onPlatformChange` to toggle platform inclusion instead of replacement.

### 2. Sidebar Updates (`APIStatusSidebar.tsx`)

- Update `APIStatusSidebarProps` to accept `selectedPlatforms: PlatformName[]`.

- Modify click handlers to support multi-selection.

- Update visual active states to reflect multiple selections.

- **Clay Toggle**: Integrate "Clay" selection into the multi-select logic (selecting Clay adds Clay platforms to the list).

### 3. Component Updates

- **`APIItem`** **(`APIStatusDashboard.tsx`)**:

  - Update to accept `selectedPlatforms` array.

  - **New Logic**:

    - **Green**: Supported in **ALL** selected platforms.

    - **Red**: Supported in **NONE** of the selected platforms.

    - **Amber**: Partially supported (supported in some, but not all).

  - This gives immediate visual feedback on cross-platform compatibility.

### 4. Page Updates

- **Coverage Page (`CoveragePage.tsx`)**:

  - Render a **Coverage Card** for each selected platform.

  - Update **Parity Chart** to display multiple trend lines (one per platform) for direct comparison.

- **Categories Page (`CategoryTable.tsx`)**:

  - Dynamically render columns for all selected platforms.

  - Update "Missing APIs" section to identify gaps across the selected set.

- **Recent Page (`RecentPage.tsx`)**:

  - Display recent API lists for all selected platforms, stacked by platform.

- **Search Page (`SearchPage.tsx`)**:

  - Update "State" filter logic:

    - "Supported" -> Supported in **ALL** selected platforms.

    - "Unsupported" -> Unsupported in **ALL** selected platforms (or at least one? I will default to "Unsupported in at least one" i.e. "Not fully supported").

### 5. `APIStatusDashboard.tsx` (Standalone)

- Update the standalone dashboard component to match the new multi-select behavior for consistency.
