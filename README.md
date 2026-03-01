# Scoundrel (Static Web App)

A polished, mobile-first browser implementation of the solo card game **Scoundrel**, built with vanilla HTML, CSS, and JavaScript.

## Game Overview

You are a lone adventurer in a dungeon deck.

- Start at **20 health**
- Manage **weapons** (♦2–10) and **potions** (♥2–10)
- Fight **monsters** (♣/♠, values 2–14 where A = 14)
- Clear the dungeon to win

## Rules Implemented

- 44-card dungeon deck from a standard deck:
  - Monsters: all ♣ and ♠ (2–10, J/Q/K/A)
  - Weapons: ♦2–10
  - Potions: ♥2–10
- Draw to a **4-card room** each turn
- Choose either:
  - **Avoid**: move all room cards to the bottom of the deck (cannot avoid twice in a row; not available once you have resolved at least one card in the room)
  - **Face**: resolve exactly 3 cards in any order, then carry the 4th into the next room
- Weapon behavior:
  - Equipping a new weapon discards old weapon + stacked monsters
  - Weapon can only be used against a non-increasing sequence of defeated monster values
- Potion behavior:
  - Heal up to 20
  - Max one effective potion per room (extra potions are discarded)
- End conditions:
  - **Win** when the dungeon deck is cleared
  - **Lose** when health reaches 0
- Score:
  - Win score = remaining health
  - Loss score = negative sum of monster values remaining in the deck, current room, and carry card

## How to Run

No build step, server, or dependencies required.

1. Open `index.html` directly in your browser.
2. Play using on-screen controls or keyboard navigation.
3. Your run is saved automatically. Reopening the page resumes where you left off.

## Controls

- **New Game** — discard the current run and start a fresh one
- **Avoid Room** — send all room cards to the bottom of the deck (subject to avoid rules)
- **Help / Rules** — open the in-game rules reference

## File Responsibilities

- `index.html`
  - App shell, HUD (health, weapon, run stats, score banner), room container, controls, action log, help modal, end-of-run modal
- `css/styles.css`
  - Theme variables, responsive layout, card visuals, motion, accessibility/focus styles
- `js/constants.js`
  - Shared game constants and enums
- `js/utils.js`
  - Shuffle + seedable RNG utilities, card formatting helpers
- `js/game.js`
  - Core game model and all Scoundrel rule logic
- `js/ui.js`
  - DOM queries and rendering for HUD, room, log, and end-of-run modal
- `js/storage.js`
  - LocalStorage save/load helpers
- `js/main.js`
  - App bootstrap, control event wiring, render/update cycle

## Accessibility Features

- Keyboard-accessible buttons and room card actions
- Visible `:focus-visible` outlines
- ARIA labels for controls and room cards
- Action log in live region (`role="log"`, `aria-live="polite"`)
- Score banner uses `aria-live="polite"` to announce the result
- `prefers-reduced-motion` handling for animations
