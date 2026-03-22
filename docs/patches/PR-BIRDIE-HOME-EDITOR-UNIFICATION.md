# PR-BIRDIE-HOME-EDITOR-UNIFICATION

## What this patch changes
- Rewires the tenant Appearance & Brand → Home tab to use the Birdie-capable `HomeLandingEditorSection` instead of the legacy `HomeLandingAdvancedEditor`.
- Keeps the existing snapshot-driven publish model intact.
- Clarifies the editor copy so draft vs live behavior is more obvious.

## Files changed
- `components/owner/setup/appearance/AppearanceBrandPanel.tsx`
- `app/book/[slug]/setup/sections/HomeLandingEditorSection.tsx`

## Expected result
- Home template dropdown includes `Birdie destination` from the same place as the wellness/editorial page.
- `Load Birdie landing preset` is visible in the same editor flow.
- User saves draft, then publishes booking page to update the live snapshot.

## After applying
1. Deploy frontend.
2. Open tenant → Appearance & Brand → Home tab.
3. Choose `Birdie destination`.
4. Click `Load Birdie landing preset`.
5. Click `Save draft`.
6. Click `Publish booking page`.
7. Open the live booking page and verify the Birdie home content changed.
