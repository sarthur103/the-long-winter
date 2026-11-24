# The Long Winter

An installable, mobile-first rabbit evolution game. Guide a colony of 120 rabbits through eight adaptation choices and a ninth spring finale. The simulation is an exact port of the V3 game-balance model in `reference/`. It is a game model with illustrative coefficients, not a scientific ecology forecast.

## Play locally

Install Node.js if needed (modern version), then open this directory in a terminal:

```sh
npm test
npm start
```

Open http://127.0.0.1:8787/ in your browser. No npm dependencies or network services are needed to run the game. The local server listens only on this computer.

## Game guide

- Each decision provides two eligible random signed traits: one physical and one behavioral. Select exactly one. It develops over two periods, with diminishing improvements for repeated selections in the same direction.
- Forecast values are upcoming temperature in Fahrenheit, external food productivity relative to baseline, and predator pressure. Colony health reports the four safety indices from the last period.
- The canvas is an illustrative isometric ecosystem. Its terrain, weather, rabbits and physical traits respond to the simulation; each visual rabbit represents approximately six colony rabbits.
- Spring has no new choice; it completes the last adaptation. Final population thresholds are 30, 48, and 58 for one, two, and three stars.
- Progress and lifetime history save automatically on the device. The settings screen supports backup export/import, reduced motion, optional sound and compatible haptics, and a developer mode with deterministic seeds and policy-assisted selection. Assisted runs are recorded but excluded from lifetime statistics.

## Verification

`npm test` runs eight tests, including regression checks against `reference/rabbit_v3_results.json`:

- all 10 sample states, exact population and chosen adaptation, and 40 safety scores (floating-point tolerance 1e-9);
- 15,000 seeded playthroughs across random, greedy and lookahead policies, comparing every reported aggregate;
- 400 exhaustive seed trees (102,400 decision paths), comparing all published tree metrics;
- save/resume, eligibility and two-turn development, finale, score tracking and import validation.

The browser was also exercised through a complete playthrough, mid-run reload and resume, lifetime history, phone-width rendering, and an offline reload after the server was stopped. Native iPhone installation remains a device-level test.

## Publish using GitHub Pages

The `docs/` directory is the complete deployable static PWA. There is no build step and no backend. The reference material and tests are outside the published folder.

In the repository, open **Settings → Pages**. Select **Deploy from a branch**, branch **main**, folder **/docs**, and save. Verify that the HTTPS site is available before installing on iPhone. GitHub Free requires a public repository for Pages; private repositories require a supported paid plan.

On iPhone, open the published HTTPS site in Safari, tap Share, choose Add to Home Screen, and launch the icon. After the first successful load the game can run offline. Local data is tied to the browser/hosting origin rather than your GitHub account, and iOS can clear it; export backups and use the same domain for updates.
