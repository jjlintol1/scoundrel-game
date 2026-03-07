import {
  CARD_TYPE,
  MAX_HEALTH,
  RESOLVES_PER_ROOM,
  ROOM_SIZE,
  SUITS,
} from "./constants.js";
import {
  cardLabel,
  cardTypeForSuit,
  createRng,
  fisherYatesShuffle,
} from "./utils.js";

export function createNewGame(options = {}) {
  const seed = options.seed ?? null;
  const rng = createRng(seed);
  const deck = fisherYatesShuffle(buildDungeonDeck(), rng);

  const state = {
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    turn: 0,
    deck,
    discard: [],
    room: [],
    roomSlots: [],
    resolvedCardIds: [],
    carryCard: null,
    roomResolvedCount: 0,
    usedPotionThisRoom: false,
    cannotAvoidNext: false,
    weapon: null,
    log: [],
    status: "playing",
    score: null,
    outcome: null,
    defeatingCard: null,
    seed,
  };

  beginTurn(state);
  pushLog(state, "New run started.");
  return state;
}

export function beginTurn(state) {
  if (state.status !== "playing") return;

  state.turn += 1;
  state.roomResolvedCount = 0;
  state.usedPotionThisRoom = false;

  const nextRoom = [];
  if (state.carryCard) {
    nextRoom.push(state.carryCard);
    state.carryCard = null;
  }

  while (nextRoom.length < ROOM_SIZE && state.deck.length > 0) {
    nextRoom.push(state.deck.shift());
  }

  state.room = nextRoom;
  state.roomSlots = [...nextRoom];
  state.resolvedCardIds = [];

  if (state.room.length === 0) {
    concludeWin(state);
  }
}

export function avoidRoom(state) {
  if (state.status !== "playing") return;

  if (state.roomResolvedCount > 0) {
    pushLog(
      state,
      "You already started facing this room; avoid is no longer available."
    );
    return;
  }

  if (state.cannotAvoidNext) {
    pushLog(state, "Cannot avoid twice in a row.");
    return;
  }

  if (state.room.length === 0) {
    pushLog(state, "No room to avoid.");
    return;
  }

  state.deck.push(...state.room);
  pushLog(
    state,
    `Avoided room and sent ${state.room.length} cards to bottom of deck.`
  );
  state.room = [];
  state.cannotAvoidNext = true;

  if (state.deck.length === 0) {
    concludeWin(state);
    return;
  }

  beginTurn(state);
}

export function resolveRoomCard(state, roomRef) {
  if (state.status !== "playing") return;

  if (!Array.isArray(state.resolvedCardIds)) {
    state.resolvedCardIds = [];
  }

  const roomIndex =
    typeof roomRef === "number"
      ? roomRef
      : state.room.findIndex((card) => card.id === roomRef);

  const card = state.room[roomIndex];
  if (!card) return;

  const [selected] = state.room.splice(roomIndex, 1);
  state.resolvedCardIds.push(selected.id);
  resolveCard(state, selected);
  state.roomResolvedCount += 1;

  if (state.status !== "playing") {
    return;
  }

  if (state.deck.length === 0 && state.room.length === 0) {
    concludeWin(state);
    return;
  }

  if (state.roomResolvedCount >= RESOLVES_PER_ROOM) {
    finalizeRoom(state);
  }
}

function finalizeRoom(state) {
  if (state.room.length > 0) {
    state.carryCard = state.room.shift();
    pushLog(state, `Carried ${cardLabel(state.carryCard)} into next room.`);
  } else {
    state.carryCard = null;
  }

  state.room = [];
  state.cannotAvoidNext = false;

  if (state.deck.length === 0) {
    concludeWin(state);
    return;
  }

  beginTurn(state);
}

function resolveCard(state, card) {
  if (card.type === CARD_TYPE.WEAPON) {
    resolveWeapon(state, card);
    return;
  }

  if (card.type === CARD_TYPE.POTION) {
    resolvePotion(state, card);
    return;
  }

  resolveMonster(state, card);
}

function resolveWeapon(state, card) {
  if (state.weapon) {
    state.discard.push(state.weapon.card, ...state.weapon.stack);
    pushLog(
      state,
      `Dropped ${cardLabel(state.weapon.card)} and discarded ${state.weapon.stack.length} stacked monsters.`
    );
  }

  state.weapon = {
    card,
    value: card.value,
    lastDefeated: null,
    stack: [],
  };
  pushLog(state, `Equipped ${cardLabel(card)}.`);
}

function resolvePotion(state, card) {
  if (state.usedPotionThisRoom) {
    // Worked example:
    // If ♥4 was already used in this room, resolving ♥7 later in
    // the same room discards ♥7 with no healing effect.
    state.discard.push(card);
    pushLog(
      state,
      `${cardLabel(card)} discarded: only one potion per room may be used.`
    );
    return;
  }

  state.usedPotionThisRoom = true;
  const before = state.health;
  state.health = Math.min(state.maxHealth, state.health + card.value);
  const healed = state.health - before;
  state.discard.push(card);

  if (healed > 0) {
    pushLog(state, `Used ${cardLabel(card)} and healed ${healed}.`);
  } else {
    pushLog(state, `Used ${cardLabel(card)} but health was already full.`);
  }
}

function resolveMonster(state, card) {
  let damage = card.value;
  let weaponUsed = false;

  if (state.weapon) {
    const canUseWeapon =
      state.weapon.lastDefeated === null ||
      card.value <= state.weapon.lastDefeated;

    if (canUseWeapon) {
      weaponUsed = true;
      damage = Math.max(0, card.value - state.weapon.value);

      // Worked example:
      // Weapon is ♦7, lastDefeated is 8.
      // Against ♠6 -> allowed (6 <= 8), damage max(0, 6 - 7) = 0.
      // Stack ♠6 and set lastDefeated to 6.
      if (damage === 0) {
        state.weapon.stack.push(card);
        state.weapon.lastDefeated = card.value;
        pushLog(
          state,
          `${cardLabel(card)} defeated with ${cardLabel(state.weapon.card)} (0 damage).`
        );
      } else {
        pushLog(
          state,
          `${cardLabel(card)} fought with ${cardLabel(state.weapon.card)} for ${damage} damage.`
        );
      }
    } else {
      pushLog(
        state,
        `${cardLabel(card)} too high for weapon sequence (needs <= ${state.weapon.lastDefeated}). Bare-handed.`
      );
    }
  }

  if (!weaponUsed) {
    pushLog(
      state,
      `Bare-handed against ${cardLabel(card)} for ${damage} damage.`
    );
  }

  state.health -= damage;
  state.discard.push(card);

  if (state.health <= 0) {
    state.defeatingCard = card;
    concludeLoss(state);
    return;
  }
}

function concludeWin(state) {
  if (state.status !== "playing") return;
  state.status = "won";
  state.outcome = "Victory";
  state.score = state.health;
  pushLog(state, `Dungeon cleared. Final score: ${state.score}.`);
}

function concludeLoss(state) {
  if (state.status !== "playing") return;
  state.status = "lost";
  state.outcome = "Defeat";
  const remainingMonsterTotal = calculateRemainingMonsterTotal(state);
  state.score = -remainingMonsterTotal;
  pushLog(state, `You fell in the dungeon. Final score: ${state.score}.`);
}

function calculateRemainingMonsterTotal(state) {
  const pendingCards = [...state.deck, ...state.room];
  if (state.carryCard) {
    pendingCards.push(state.carryCard);
  }

  return pendingCards
    .filter((card) => card.type === CARD_TYPE.MONSTER)
    .reduce((sum, card) => sum + card.value, 0);
}

function pushLog(state, message) {
  state.log.unshift({
    message,
    at: new Date().toISOString(),
    turn: state.turn,
  });
  if (state.log.length > 150) {
    state.log.length = 150;
  }
}

function buildDungeonDeck() {
  const deck = [];

  for (const suit of [SUITS.CLUBS, SUITS.SPADES]) {
    for (let value = 2; value <= 14; value += 1) {
      deck.push(createCard(suit, value));
    }
  }

  for (let value = 2; value <= 10; value += 1) {
    deck.push(createCard(SUITS.DIAMONDS, value));
  }

  for (let value = 2; value <= 10; value += 1) {
    deck.push(createCard(SUITS.HEARTS, value));
  }

  return deck;
}

function createCard(suit, value) {
  return {
    id: crypto.randomUUID(),
    suit,
    value,
    type: cardTypeForSuit(suit),
  };
}
