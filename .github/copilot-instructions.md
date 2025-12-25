# Komensky Play App - AI Agent Instructions

## Project Overview
Educational child development tracking app built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase. Tracks developmental progress across 7 play categories (대근육, 소근육, 스스로, 문제해결, 사회정서, 수용언어, 표현언어) with multi-level achievement tracking.

## Critical Architecture Patterns

### Data Flow & Storage Strategy
- **Hybrid Storage**: Supabase (auth, global UI settings, child profiles) + localStorage (per-device play records, UI preferences)
- **Play Data**: Static data parsed from `../public/play_data.txt` at build time via `../public/make_play_data_out.ts` → generates `../public/play_data_OUT.txt`
- **Global Categories**: Dynamic category system loaded via `../lib/global-categories.ts` from `../lib/data-parser.ts` - categories are initialized once and cached
- **Child Profiles**: Email-scoped keys `komensky_child_profile_${email}` in localStorage, synced to Supabase `children` table
- **Play Records**: Category-specific keys `komensky_records_${categoryName}` in localStorage - intentionally NOT synced to preserve privacy

### Component Communication
- **Event-driven**: `window.dispatchEvent()` with custom events (`komensky:playSelect`, `komensky:childrenChanged`) bridges components
- **Global Window Objects**: `window.__KOMENSKY_PLAY_DATA__` caches parsed play data for O(1) detail lookups in `../components/play-detail-panel.tsx`
- **Context Providers**: `../components/context/UISettingsContext.tsx` manages UI state; `../lib/ui-design.ts` handles CSS variable injection

### UI Design System
- **Dual CSS Variable Namespaces**: `--kp-*` (UIDesignDialog params) and `--ui-*` (UISettingsContext) - see `../docs/UI_PARAMETER_AUDIT.md`
- **Known Issue**: Only 29% of UIDesignDialog params actually apply CSS - many are stored but not connected to UI
- **Dynamic Theming**: `../lib/ui-design.ts` `applyUIDesignCSS()` injects CSS variables; Supabase `ui_settings` table stores global presets
- **Mobile Check**: Phone number validation via user metadata drives intro dialog flow (see `INTRO_TEST_MODE` flag in `../app/page.tsx`)

## Development Workflows

### Build & Run
```powershell
pnpm install           # First-time setup (runs postinstall → make-play-data-out)
pnpm dev              # Development server on localhost:3000
pnpm build            # Production build (TypeScript/ESLint errors ignored - see next.config.mjs)
```

### Data Processing Pipeline (Python → TypeScript)
1. **Extract from details files**: Run `../extract_play_data.py` → generates `../public/play_data_extracted.json`
2. **Convert to text format**: Run `../generate_play_data_txt.py` → updates `../public/play_data.txt`
3. **Build-time processing**: `pnpm install` automatically runs `../public/make_play_data_out.ts` to create `../public/play_data_OUT.txt`
4. **Frontend parsing**: `../lib/data-parser.ts` `parsePlayData()` reads `../public/play_data_OUT.txt` and populates categories

**Python Scripts Glossary**:
- `fix_*.py` / `remove_*.py` / `sort_*.py` - One-off data cleanup utilities (run manually as needed)
- `restructure_*.py` - Transform activity data structures

### Debugging Tips
- **Bridge Legacy**: `../app/page.tsx` has `[BRIDGE]` section that ensures `window.renderDetailPanel` exists - checks hash `#probe-legacy`
- **Intro Test Mode**: Set `INTRO_TEST_MODE = true` in `../app/page.tsx` to test intro dialog states without modifying real data
- **Storage Keys**: Use browser DevTools → Application → Local Storage to inspect `komensky_*` keys
- **Category Mismatch**: If categories don't load, check `../lib/global-categories.ts` initialization and `../public/play_data.txt` format

## Project-Specific Conventions

### File Naming & Organization
- **Components**: PascalCase `.tsx` (e.g., `PlayListPanel.tsx`) except `ui/` subfolder (kebab-case from shadcn/ui)
- **Library Utilities**: kebab-case `.ts` in `lib/` (e.g., `../lib/data-parser.ts`, `../lib/storage-core.ts`)
- **Korean Documentation**: `*_ko.md` suffix (e.g., `../README_ko.md`, `../docs/README_UI_Color_Popup_Install_ko.md`)
- **Annotated Headers**: Most `.ts`/`.tsx` files have baseline date annotations (e.g., "Annotated on 2025-10-20")

### TypeScript Patterns
- **Type Safety**: `ignoreBuildErrors: true` in `../next.config.mjs` but aim for correctness - errors are warnings
- **Type Imports**: Prefer `import type { ... }` for types to avoid runtime imports
- **Global Types**: Extend `Window` interface in component files when adding global properties (see `../components/play-detail-panel.tsx`)

### State Management
- **No Redux/Zustand**: Uses React Context + localStorage + custom events
- **Persistent State Hook**: `../hooks/usePersistentState.ts` for localStorage-backed state
- **Category Records**: Per-category storage via `../lib/storage-category.ts` `loadCategoryRecord()` / `saveCategoryRecord()`
- **Child Data Backup**: `../lib/child-data-backup.ts` provides export/import for offline backup

## Integration Points

### Supabase Setup
- **Required Env Vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- **Tables**: `children` (child profiles), `ui_settings` (global UI presets), auth handled by Supabase Auth
- **Client Initialization**: `../lib/supabaseClient.ts` exports `supabase` instance (nullable if env vars missing)
- **Auth Flow**: `../components/auth-dialog.tsx` handles login/signup via magic link

### External Dependencies
- **Radix UI**: All interactive components (dialogs, dropdowns, checkboxes) use `@radix-ui/react-*`
- **Chart.js**: `../components/radar-graph.tsx` and `../components/time-axis-graph.tsx` for visualization
- **Tailwind Animate**: Plugin enabled in `../tailwind.config.js` for UI transitions

## Key Files to Understand First
1. `../app/page.tsx` - Main app orchestrator with auth, intro, and data sync
2. `../lib/types.ts` - Core type definitions for play data, child profiles, records
3. `../lib/data-parser.ts` - Play data parsing from text format
4. `../lib/storage-core.ts` - Child profile and record persistence
5. `../components/play-list-panel.tsx` - Activity list with favorites/comments
6. `../components/play-detail-panel.tsx` - Multi-level achievement tracking UI

## Common Pitfalls
- **Category Name Confusion**: Korean names (대근육) are canonical; English names (gross-motor) are mapped aliases
- **Date Serialization**: Always use `.toISOString()` when storing Date objects in localStorage
- **Window Objects**: Check `typeof window !== "undefined"` before accessing `window` or `localStorage`
- **CSS Variable Priority**: Supabase global UI settings override localStorage - see `../lib/ui-design.ts` `fetchGlobalUIDesignCfg()`
- **Play Data Regeneration**: After modifying `../public/play_data.txt`, run `pnpm run make-play-data-out` manually or reinstall
