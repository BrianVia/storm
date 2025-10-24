# URL State Management

The Storm frontend now supports URL-based state management for filters, search, and sorting. This allows users to:
- Bookmark specific filtered views
- Share links with specific filter/search criteria
- Maintain state across page refreshes
- Use browser back/forward navigation

## Implementation

### Query Parameters

The following query parameters are synchronized with the UI state:

| Parameter | Description | Example Values | Default |
|-----------|-------------|----------------|---------|
| `q` | Search query text | Any string | `""` (empty) |
| `filter` | Torrent state filter | `Active`, `Queued`, `Downloading`, `Seeding`, `Paused`, `Error` | `null` (All) |
| `sort` | Sort field | `State`, `TimeAdded`, `Progress`, `ETA`, `Name`, `TotalSize`, `Ratio`, `SeedingTime` | `null` (unsorted) |
| `reverse` | Sort direction | `true`, `false` | `false` (ascending) |

### Example URLs

**Show all active torrents:**
```
http://localhost:8080/?filter=Active
```

**Search for specific torrent:**
```
http://localhost:8080/?q=ubuntu
```

**Downloading torrents sorted by progress (descending):**
```
http://localhost:8080/?filter=Downloading&sort=Progress&reverse=true
```

**Complex filter with search and sorting:**
```
http://localhost:8080/?q=debian&filter=Seeding&sort=Ratio&reverse=true
```

## How It Works

### Architecture

The implementation uses:
- **Angular Router** for URL query parameter management
- **RxJS BehaviorSubjects** for reactive state management
- **TypeScript getters/setters** to intercept property changes
- **Debouncing** (300ms) for search input to avoid excessive URL updates

### State Flow

1. **On Load:**
   - Read query parameters from URL
   - Initialize component state (search, filter, sort)
   - Begin API polling with current state

2. **On User Interaction:**
   - User changes search text, filter, or sort
   - Property setter triggers BehaviorSubject update
   - Combined observable debounces changes
   - URL updates via `router.navigate()` with `replaceUrl: true`

3. **On Page Refresh:**
   - State is restored from URL query parameters
   - User sees the same view they had before refresh

### Code Structure

**Files Modified:**
- `frontend/src/app/app.module.ts` - Added RouterModule
- `frontend/src/app/app.component.ts` - Added URL state management

**Key Methods:**
```typescript
// Initialize state from URL on component creation
private initializeFromUrl(): void

// Subscribe to state changes and update URL
private syncStateToUrl(): void

// Update browser URL with current state
private updateUrl(search, filterState, sortField, reverse): void
```

**Reactive Properties:**
```typescript
// Properties now use BehaviorSubjects internally
get searchText(): string
set searchText(value: string)

get sortByField(): keyof Torrent
set sortByField(value: keyof Torrent)

get sortReverse(): boolean
set sortReverse(value: boolean)
```

## Benefits

### User Experience
- **Bookmarkable Views:** Save frequently used filter combinations
- **Shareable Links:** Send specific torrent views to others
- **Browser Navigation:** Back/forward buttons work with filters
- **State Persistence:** Survives page reloads

### Developer Experience
- **No Breaking Changes:** Existing template bindings work unchanged
- **Reactive Design:** State changes automatically sync to URL
- **Type Safety:** TypeScript ensures valid parameter values
- **Debounced Updates:** Prevents URL spam during typing

## Technical Details

### Debouncing Strategy

Search text changes are debounced by 300ms to prevent excessive URL updates while typing:

```typescript
this._searchText$.pipe(
  distinctUntilChanged(),
  debounceTime(300)
)
```

Other state changes (filter, sort) update immediately since they're discrete selections.

### URL Update Strategy

Uses `replaceUrl: true` to avoid cluttering browser history:

```typescript
this.router.navigate([], {
  relativeTo: this.route,
  queryParams,
  queryParamsHandling: 'merge',
  replaceUrl: true  // Don't add to history stack
});
```

### Validation

Query parameters are validated against allowed values:
- Filter states must match predefined options
- Sort fields must be valid Torrent properties
- Invalid parameters are ignored (fall back to defaults)

## Future Enhancements

Potential improvements:
- **URL Shortening:** Use abbreviated parameter names (e.g., `f` instead of `filter`)
- **State Compression:** Encode complex states in shorter format
- **Deep Linking:** Support direct links to specific torrent details
- **History Mode:** Option to use `pushState` instead of `replaceUrl` for filter history
- **Preset Views:** Named filter combinations (e.g., `/active`, `/downloading`)

## Testing

To test the implementation:

1. **Basic URL Loading:**
   - Navigate to `http://localhost:8080/?q=test&filter=Active`
   - Verify search box shows "test" and filter shows "Active"

2. **State Persistence:**
   - Apply filters/search in UI
   - Refresh the page
   - Verify state is restored

3. **URL Updates:**
   - Change search text
   - Observe URL updates after 300ms debounce
   - Change filter/sort immediately updates URL

4. **Invalid Parameters:**
   - Navigate to `http://localhost:8080/?filter=InvalidState`
   - Verify app falls back to "All" filter (null)

## Browser Compatibility

Requires browsers with:
- `URLSearchParams` support
- ES6 Proxy support (for Angular)
- History API

All modern browsers (Chrome 49+, Firefox 44+, Safari 10+, Edge 14+) are supported.
