# Congressional App Challenge working copy

Based on MarbleProjectWebsite. Original and improved folders were preserved.

Run: npm run dev -- --host 127.0.0.1 --port 5175

Journalist is the default: original layout, stable figures, no decorative animation.
Presentation: optional editorial headline driven by the loaded DOE total, staggered text reveal, bronze emphasis, and section entrances. Switch in the navigation. Choice persists on this browser. Reduced motion is respected.

The improved version's DISCOVERY.md describes previous presentation effects, but those implementations are absent from its current source tree. The new effects are recreated from those descriptions, not recovered original components.

Next data phase (not activated): recheck Checkbook NYC API and sync script; retrieve all currently available years through October 2026, including FY2027 as partial; validate totals and pagination; write versioned snapshots; add automatic CSV fallback with a visible freshness/source note; keep partial years clearly labeled and exclude them from full-year trend comparisons; set up scheduled refresh and deployment with the owner. See API_MIGRATION_PLAN.md for prior research, whose availability claims need rechecking.

Validation: production build and existing CSV audit passed after initial implementation. Browser tool startup failed in this session, so visual verification remains pending.

## Scroll story implementation (October 26)
Presentation now includes a dedicated four-chapter pinned 3D budget story: combined totals, fiscal years, top five departments, and five largest dollar overruns. Solid columns show cash spent, horizontal outlines show working budget, and red segments show spending above budget. Numbered columns correspond to adjacent lists. Scales are recalculated between chapters and displayed; final values are in the lists. Scroll directly controls interpolation in the latter part of each chapter. There is no perpetual 3D animation. Pause transitions freezes the current visualization while the page remains scrollable. Reduced motion shows chapter states without interpolated morphs. Journalist mode removes the story and disposes the renderer.

Browser verification used local Brave: 3D canvas renders; desktop and 375px layout have no horizontal overflow; switching back restores the original heading and removes the canvas; no page errors were reported. Production build passes. This replaces the earlier decorative marble approach.

## Responsive and scroll review
Checked both reading modes at 320x568, 360x800, 375x812, 390x844, 430x932, 568x320, 812x375, 768x1024, 1024x768, 1280x720, 1440x1000, 1920x1080 and 2560x1080. Fixed 812px Journalist filter overflow and intermediate navigation wrapping; compact navigation now applies through 1100px. Landscape presentation uses side-by-side visual and text to avoid consuming the entire screen with the sticky stage. Checked all four explorer panels at 320, 812 and 1024px. No page-level horizontal overflow or page errors. Scrolled all story chapters down and back up; all Journalist sections remained visible after mode restoration. These checks cover representative sizes, not every possible device/browser.

Research references examined in browser: GitHub homepage, Aceternity Sticky Scroll Reveal, React Bits Scroll Reveal. Official pages also examined: Magic UI, Kokonut, 21st.dev, Bklit, shadcn/ui, Motion, Refero and Haikei. Cult UI and Skipper UI were unavailable to the web tool. The implemented effects are project-specific adaptations of the narrative/scroll patterns, not downloaded React component code. The original app remains vanilla JavaScript.

## Independent presentation rebuild
The active presentation is now /presentation.html with src/exhibition-app.js and src/exhibition-app.css. It no longer moves or overlays Journalist DOM sections. The legacy presentation modules/styles remain in source as prior work but are not loaded by the active pages. Vite builds both HTML entries. Journalist mode redirects to the separate presentation page; its return link restores the Journalist setting. Presentation contains a fluted 3D marble hero pillar with scroll movement, a separate budget story, independent search/year/status controls, pagination, CSV export, methodology, NYC map and project video. Phone story comparisons use inline horizontal bars rather than the sticky 3D panel, preventing visual/text overlap. The desktop 3D story retains a separate grid column. Verified switches both ways, year/search filtering, empty state, and page overflow at seven widths from 320px to 2560px, including 812x375 landscape. Browser page errors: none. Desktop and phone screenshots visually inspected. Previous broad layout pass missed sticky overlap; these checks specifically address that issue.

## Marble world update
Site restarted on 127.0.0.1:5175. Added an automatic opening with “Figure out where your money goes.”, a skip/enter button, and staggered fade/blur dissolution. A continuous Three.js scene now sits behind the page: large physically shaded veined marble moves horizontally and rotates with scroll, with smaller stones providing depth. Added translucent glass surfaces and optional Auto tour, canceled by user scrolling/touch/keyboard input. Pause stops background and guided scroll updates; reduced motion uses a static scene and short opacity entrance. The original introduction slideshow remains near the top.

Primary references reviewed: https://threejs.org/examples/#webgl_materials_physical_transmission ; https://bruno-simon.com/ ; https://www.apple.com/airpods-pro/ ; https://linear.app/ ; https://reactbits.dev/backgrounds/liquid-chrome ; https://ui.aceternity.com/components/liquid-glass ; https://magicui.design/ ; https://motion.dev/docs/scroll . These informed implementation choices; their proprietary website assets/source were not copied. Existing research also contains the wider component-site inventory.

Browser validation: entrance automatically dismisses, 3D background canvas renders, pause toggles, auto tour runs and manual wheel stops it, no page errors. No horizontal page overflow at widths 320, 375, 768, 812 and 1440. Desktop screenshot visually reviewed. Low-end-device frame rate has not been measured; the scene caps rendering at 30fps and uses fewer background stones on phones.

## Presentation rebuild (October 26, Claude)
Presentation is now `presentation.html` + `src/present/` (present.js, deck.js, records.js, tour.js, present.css). It shares only the data layer with Journalist.
- Look: cool marble white and graphite "vein" sections over the live WebGL marble background (`src/modules/fluid-marble.js`, now plain WebGL — three.js removed, 515 KB → 4 KB). Copy sits on frosted glass. Type: Glacial Indifference + Instrument Serif (self-hosted via @fontsource) for figures.
- Smooth scroll: Lenis. Four pinned scroll scenes driven by scroll progress: total count-up, fiscal-year columns, department split bar, horizontal overrun cards (stacked on phones).
- Highlights slideshow rebuilt for Presentation (six slides incl. the Code Next video as a muted autoplaying slide with play/pause), autoplay timer, pauses on hover/focus/off-screen, swipe and arrow keys.
- Records explorer: search, year/status filters, pagination, CSV export, empty state.
- Play tour glides through every section and scrubs each scene (stops on any wheel/touch/key). Still mode (persisted) turns off Lenis, pinning, autoplay and the moving background; `prefers-reduced-motion` does the same.
- Fixed: `/` no longer auto-redirects to Presentation (it trapped the Back button and flashed Journalist). The selector is now the only switch.
- Old presentation files moved to `_legacy-presentation/` (not loaded).
- Verified: build, data audit, no console errors, no horizontal overflow at 1440 and 375, all controls exercised.

## Presentation v3 (October 26, Claude, later session)
- One version shipped (A): the 3D marble pillar (public/pillar/, from the owner's marble-pillar.zip, Blender export converted to a compact binary + 4096/2048/1024 JPG textures) is the page's largest element. Desktop: rendered in front, a third of the screen wide and taller than the screen, rolling side to side as you scroll (rotation tied to distance travelled), rising slowly to reveal its base. Every later section sits in the lane opposite the pillar (data-lane) and fills the viewport. Phones/touch tablets: same pillar behind frosted content. No WebGL / low-end devices: .no-pillars fallback with the year card.
- Header matches Journalist view (94px, 1280px row, 58px logo, "Reading mode" select, bold links). Mode switches use cross-document view transitions (@view-transition in present.css and src/reading-mode.css); header, logo and select stay in place.
- Content uses Journalist copy and sections: highlight slides (verbatim), Spending Overview metrics, Spending by Year, Spending by Department, Largest Overruns, Budget Details, data-driven Key Findings.
- SVGs: public/present/us-nyc.svg (tinted states, smaller NYC marker) and public/present/nyc-boroughs.svg (rebuilt from NYC borough GeoJSON, filled, labelled). UN emblem leads the UNMGCY slide.
- Hardening from reviews: CSV formula injection neutralised, tour/Still-mode fixes, carousel focus and touch timing, empty-data guards, formatCurrency rounding, real-progress loader (once per session, skipped when arriving from Journalist), Lenis-safe table scrolling, low-end and ?lite modes.
- Verified with a Playwright contact-sheet harness at 19 viewports (280×653 fold to 3440×1440): no horizontal overflow, no console errors. Software-rendered screenshots use ?lite; motion timing itself must be checked on a real GPU.
- Open content items for the owner: sources for the context slide figures ($112.4B, $38.3B, $38,000/student, 1,600+ schools, ~1M students) and written permission for the UN emblem / UNMGCY logo.

## Unroll, languages and accessibility (October 26, later)
- The pillar is now the page's roller (desktop): it waits whole under the slides, never cropped or covered by the header, and each section (data-dir="ltr"/"rtl") is revealed only where the pillar has rolled; content sits in the lane opposite the roll's end. The end screen offers Journalist view or a 2-second rewind to the top (the scroll-driven reveals play backwards). Focus entering a hidden section reveals it.
- Header on both pages: the old version's two-way Journalist | Presentation switch (src/modules/site-chrome.js, src/site-chrome.css) with a highlight that slides across during the cross-document view transition, plus a globe language menu.
- Languages: English + Spanish, Chinese (Simplified), Russian, Haitian Creole, Bengali: NYC Local Law 30's top five, all in NYC Public Schools' translation set. src/i18n/index.js (t(), translateDom with template matching), src/i18n/strings.js. Drafts need native-speaker review. Budget line names stay in English (source data). Some Journalist data-built sentences remain English unless they match a template.
- Accessibility: axe-core (WCAG 2.0/2.1/2.2 A/AA + best practice) reports zero violations on Journalist, Presentation and Presentation in Spanish. Fixed Journalist table contrast, filter labels and landmarks; Presentation dot buttons and duplicate landmark. One H1 and a lang attribute per page; decorative canvases are aria-hidden.
- Layout checked at 19 sizes (280×653 to 3440×1440) on both pages: no horizontal overflow, headers fit.

## Phase: polish before back-end handoff (Oct 26, 2026)

**Data layer (for the back-end pass)**
- `src/data/source.js` now tries sources in order (`DATA_CONFIG.sources`: `api` → `snapshot` → `csv`), each with its own timeout, and reports which one answered in `meta.source` and why earlier ones were skipped in `meta.fallbacks`.
- `api/budget.js` is a Vercel serverless proxy for the Checkbook NYC Budget API: `GET /api/budget?year=2025` returns DOE rows in the CSV's column names, cached at the edge for 24h (stale-while-revalidate 7 days). It is not deployed or tested against the live API from here. In `vite dev` it 404s and the site falls back to the CSV, as designed.
- `src/data/checkbook.js` holds the shared XML request and parse code. `scripts/sync-checkbook.mjs` uses it too.
- `apiYears` is FY2023–2025 to match the CSV; adding FY2026 or FY2027 is an owner decision (see API_MIGRATION_PLAN.md).
- Open items for the back-end pass:
  - deploy and smoke-test `/api/budget`;
  - decide on function `maxDuration`;
  - add a server-side guard against short or partial pulls;
  - consider moving the snapshot sync to a nightly GitHub Action.

**Loader**
- `src/modules/loader.js` is shared by both views and shows once per session.
- The count is paced, so a full sweep takes at least 1.8s, and it tracks the real stages. The old forced 2.6s hide is gone.

**First visit**
- `/` sends a first-time visitor to Presentation view (`localStorage marble-visited`).
- Journalist links use `/?view=journalist`, so they never bounce.

**Presentation**
- Wipes and fades now apply to each card rather than its container. A faded or clipped parent was switching off the glass blur, which caused the solid-to-clear "hitch".
- Leaving cards now fade fully out.
- Focus only unclips a scene for keyboard focus (`:focus-visible`). This was the bug where the end card showed over the About card after clicking.
- At the end, the pillar fades out and the end card glides to the centre; the footer follows. The footer is fuller, modelled on Journalist's.
- Every "back to top" control rewinds over 2s with a tape-warp overlay. The warp has not been seen on a real GPU yet.
- Stage width bug fixed: `.pillar-stage` had its own 30vw `--stage-w` and the gutter fell back to 24px, so content sat about 9px under the pillar.
- The pillar is capped at 32vw on squarer screens.
- The records card fills the frame and the table scrolls inside it.
- The fit check (`scratchpad/tools/fit.mjs`) passes at 11 sizes, from 800x1200 to 3440x1440.
- The highlights slideshow is sized to the screen at every width, and its controls stay visible.
- The tour is shorter: it steps through the slides at 1.7s each, and the Tour chip fills as a progress bar.
- Map zoom (US map → NYC → boroughs) is a trial behind `?mapzoom` and is not final.
- The top 250 lines by cash spent link to a Google News search for that line. These are searches, not claimed articles.

**Look**
- Corners are near-square (2–4px), with the data cards fully square.
- Liquid glass: near-clear panes, light blur, lit rims, slightly translucent text.
- The coloured top stripes on the findings cards are replaced by a hairline and a glow.
- The pillar is back to its previous lighting, at 93% opacity.

**Translations**
- Bangla fixes, including the title "দেশের মধ্যে সবচেয়ে বড় নগর বাজেট", the page counter and the finding titles.
- All languages still need review by a native speaker.
