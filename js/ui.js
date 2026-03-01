import { CARD_TYPE, MAX_HEALTH } from "./constants.js";
import { cardLabel, formatValue } from "./utils.js";

let wasAvoidLockedByRoomChoice = false;
const DECK_BACK_URL = new URL("../assets/deck.jpg", import.meta.url).href;

export async function animateResolvedCard(cardElement) {
  if (!cardElement) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  cardElement.disabled = true;
  cardElement.classList.add("room-card--animating");

  if (prefersReducedMotion) {
    cardElement.classList.add("room-card--deck-back");
    cardElement.style.backgroundImage = `url("${DECK_BACK_URL}")`;
    return;
  }

  await runAnimation(
    cardElement,
    [
      { transform: "perspective(900px) rotateY(0deg)", opacity: 1 },
      { transform: "perspective(900px) rotateY(90deg)", opacity: 0.96 },
    ],
    { duration: 170, easing: "ease-in", fill: "forwards" }
  );

  cardElement.classList.add("room-card--deck-back");
  cardElement.style.backgroundImage = `url("${DECK_BACK_URL}")`;

  await runAnimation(
    cardElement,
    [
      { transform: "perspective(900px) rotateY(90deg)", opacity: 0.96 },
      { transform: "perspective(900px) rotateY(180deg)", opacity: 1 },
    ],
    { duration: 190, easing: "ease-out", fill: "forwards" }
  );

  await runAnimation(
    cardElement,
    [
      { opacity: 1, transform: "perspective(900px) rotateY(180deg) scale(1)" },
      {
        opacity: 0,
        transform: "perspective(900px) rotateY(180deg) scale(0.96)",
      },
    ],
    { duration: 120, easing: "ease-in", fill: "forwards" }
  );
}

export function getDomRefs() {
  return {
    healthMeter: byId("healthMeter"),
    healthFill: byId("healthFill"),
    healthLabel: byId("healthLabel"),
    scoreBanner: byId("scoreBanner"),
    weaponLabel: byId("weaponLabel"),
    weaponRuleLabel: byId("weaponRuleLabel"),
    turnCount: byId("turnCount"),
    deckCount: byId("deckCount"),
    discardCount: byId("discardCount"),
    avoidState: byId("avoidState"),
    avoidBtn: byId("avoidBtn"),
    newGameBtn: byId("newGameBtn"),
    helpBtn: byId("helpBtn"),
    clearLogBtn: byId("clearLogBtn"),
    roomGrid: byId("roomGrid"),
    roomHint: byId("roomHint"),
    logList: byId("logList"),
    helpModal: byId("helpModal"),
    endModal: byId("endModal"),
    endSummary: byId("endSummary"),
    endKillerSection: byId("endKillerSection"),
    endKillerCard: byId("endKillerCard"),
    endTitle: byId("endTitle"),
  };
}

export function render(state, dom, handlers) {
  renderHud(state, dom);
  renderRoom(state, dom, handlers);
  renderLog(state, dom);

  const avoidLockedByRoomChoice = state.roomResolvedCount > 0;
  dom.avoidBtn.disabled =
    state.status !== "playing" ||
    state.cannotAvoidNext ||
    avoidLockedByRoomChoice;
  dom.avoidBtn.setAttribute("aria-disabled", String(dom.avoidBtn.disabled));

  if (
    !wasAvoidLockedByRoomChoice &&
    avoidLockedByRoomChoice &&
    state.roomResolvedCount === 1
  ) {
    pulseAvoidButton(dom.avoidBtn);
  }
  wasAvoidLockedByRoomChoice = avoidLockedByRoomChoice;

  if (state.status !== "playing") {
    openEndModal(state, dom);
  }
}

function pulseAvoidButton(button) {
  button.classList.remove("avoid-btn--pulse");
  void button.offsetWidth;
  button.classList.add("avoid-btn--pulse");
  button.addEventListener(
    "animationend",
    () => {
      button.classList.remove("avoid-btn--pulse");
    },
    { once: true }
  );
}

function renderHud(state, dom) {
  const clampedHealth = Math.max(0, Math.min(MAX_HEALTH, state.health));
  const healthPercent = (clampedHealth / MAX_HEALTH) * 100;

  dom.healthMeter.setAttribute("aria-valuenow", String(clampedHealth));
  dom.healthFill.style.width = `${healthPercent}%`;
  dom.healthLabel.textContent = `${clampedHealth} / ${MAX_HEALTH}`;

  if (!state.weapon) {
    dom.weaponLabel.textContent = "None";
    dom.weaponRuleLabel.textContent = "Last defeated: —";
  } else {
    dom.weaponLabel.textContent = `${cardLabel(state.weapon.card)} (value ${state.weapon.value})`;
    dom.weaponRuleLabel.textContent = `Last defeated: ${
      state.weapon.lastDefeated ? formatValue(state.weapon.lastDefeated) : "—"
    }`;
  }

  dom.turnCount.textContent = String(state.turn);
  dom.deckCount.textContent = String(state.deck.length);
  dom.discardCount.textContent = String(state.discard.length);
  dom.avoidState.textContent = state.cannotAvoidNext
    ? "Locked (consecutive avoid rule)"
    : state.roomResolvedCount > 0
      ? "Locked (already facing room)"
      : "Available";

  if (state.status !== "playing") {
    const isVictory = state.status === "won";
    dom.scoreBanner.hidden = false;
    dom.scoreBanner.className = `score-banner score-banner--${isVictory ? "victory" : "defeat"}`;
    dom.scoreBanner.textContent = isVictory
      ? `🏆 Victory! — Final Score: ${state.score}`
      : `💀 Defeated — Final Score: ${state.score}`;
  } else {
    dom.scoreBanner.hidden = true;
  }
}

function renderRoom(state, dom, handlers) {
  dom.roomGrid.innerHTML = "";

  if (state.status !== "playing") {
    dom.roomHint.textContent = "Game over. Start a new run to play again.";
  } else if (state.room.length === 0) {
    dom.roomHint.textContent = "No cards in room.";
  } else {
    dom.roomHint.textContent = `Resolve ${Math.max(0, 3 - state.roomResolvedCount)} more card(s).`;
  }

  state.room.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `room-card room-card--${card.type} revealing`;
    const cardArtPath = getCardArtPath(card);
    if (cardArtPath) {
      button.classList.add("room-card--with-art");
      button.style.backgroundImage = `url("${cardArtPath}")`;
    }
    button.role = "listitem";
    button.setAttribute(
      "aria-label",
      `Resolve ${card.type} card ${cardLabel(card)} at position ${index + 1}`
    );

    if (state.status !== "playing") {
      button.disabled = true;
    }

    const valueTopLeft = document.createElement("span");
    valueTopLeft.className = "room-card__value room-card__value--top-left";
    valueTopLeft.textContent = cardLabel(card);

    const typeTopRight = document.createElement("span");
    typeTopRight.className = "room-card__type";
    typeTopRight.textContent = typeLabel(card.type);

    const descriptionBottomLeft = document.createElement("span");
    descriptionBottomLeft.className = "room-card__description";
    descriptionBottomLeft.textContent = cardSubText(card);

    button.append(valueTopLeft, typeTopRight, descriptionBottomLeft);
    button.addEventListener("click", () =>
      handlers.onResolveCard(index, button)
    );
    dom.roomGrid.append(button);
  });
}

function renderLog(state, dom) {
  dom.logList.innerHTML = "";

  if (state.log.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No events yet.";
    dom.logList.append(empty);
    return;
  }

  let activeTurnLabel = null;

  state.log.slice(0, 80).forEach((entry) => {
    const turnLabel = getTurnLabel(entry.turn);

    if (turnLabel !== activeTurnLabel) {
      activeTurnLabel = turnLabel;
      const turnHeader = document.createElement("li");
      turnHeader.className = "log-list__turn";
      turnHeader.textContent = turnLabel;
      dom.logList.append(turnHeader);
    }

    const item = document.createElement("li");
    item.className = "log-list__entry";
    item.textContent = entry.message;
    dom.logList.append(item);
  });
}

function getTurnLabel(turn) {
  if (typeof turn === "number" && turn > 0) {
    return `Turn ${turn}`;
  }

  return "General";
}

function openEndModal(state, dom) {
  const isVictory = state.status === "won";

  dom.endTitle.textContent = isVictory ? "🏆 Victory!" : "💀 Defeated";

  // Killer card section (defeat only)
  if (!isVictory && state.defeatingCard) {
    const card = state.defeatingCard;
    const artPath = getCardArtPath(card);
    dom.endKillerCard.className = `end-killer-card room-card room-card--${card.type}`;
    if (artPath) {
      dom.endKillerCard.style.backgroundImage = `url("${artPath}")`;
      dom.endKillerCard.classList.add("room-card--with-art");
    } else {
      dom.endKillerCard.style.backgroundImage = "";
    }
    dom.endKillerCard.textContent = "";

    const valueEl = document.createElement("span");
    valueEl.className = "room-card__value room-card__value--top-left";
    valueEl.textContent = cardLabel(card);

    const typeEl = document.createElement("span");
    typeEl.className = "room-card__type";
    typeEl.textContent = typeLabel(card.type);

    const descEl = document.createElement("span");
    descEl.className = "room-card__description";
    descEl.textContent = cardSubText(card);

    dom.endKillerCard.append(valueEl, typeEl, descEl);
    dom.endKillerSection.hidden = false;
  } else {
    dom.endKillerSection.hidden = true;
  }

  // Score summary
  dom.endSummary.innerHTML = "";

  const rows = isVictory
    ? [
        ["Outcome", "Victory — dungeon cleared!"],
        ["Final HP", `${Math.max(0, state.health)} / ${state.maxHealth}`],
        ["Score", String(state.score)],
        ["Turns survived", String(state.turn)],
      ]
    : [
        ["Outcome", "Defeat"],
        ["Score", String(state.score)],
        ["Turns survived", String(state.turn)],
      ];

  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dom.endSummary.append(dt, dd);
  }

  if (!dom.endModal.open) {
    dom.endModal.showModal();
  }
}

function typeLabel(type) {
  if (type === CARD_TYPE.MONSTER) return "Monster";
  if (type === CARD_TYPE.WEAPON) return "Weapon";
  return "Potion";
}

function cardSubText(card) {
  if (card.type === CARD_TYPE.MONSTER) return "Deals damage unless blocked.";
  if (card.type === CARD_TYPE.WEAPON) return "Equip immediately.";
  return "Only one potion works per room.";
}

function getCardArtPath(card) {
  if (card.suit === "♥") {
    return toAssetUrl("heart.jpg");
  }

  if (card.suit === "♣") {
    if (card.value <= 5) return toAssetUrl("club-1.jpg");
    if (card.value <= 10) return toAssetUrl("club-2.jpg");
    return toAssetUrl("club-3.jpg");
  }

  if (card.suit === "♠") {
    if (card.value <= 5) return toAssetUrl("spade-1.jpg");
    if (card.value <= 10) return toAssetUrl("spade-2.jpg");
    return toAssetUrl("spade-3.jpg");
  }

  if (card.suit === "♦") {
    if (card.value <= 4) return toAssetUrl("diamond-1.jpg");
    if (card.value <= 7) return toAssetUrl("diamond-2.jpg");
    return toAssetUrl("diamond-3.jpg");
  }

  return null;
}

function toAssetUrl(fileName) {
  return new URL(`../assets/${fileName}`, import.meta.url).href;
}

function runAnimation(element, keyframes, options) {
  return new Promise((resolve) => {
    if (typeof element.animate !== "function") {
      const fallbackDuration =
        typeof options?.duration === "number" ? options.duration : 0;
      setTimeout(resolve, fallbackDuration);
      return;
    }

    const animation = element.animate(keyframes, options);
    animation.addEventListener(
      "finish",
      () => {
        resolve();
      },
      { once: true }
    );
  });
}

function byId(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}
