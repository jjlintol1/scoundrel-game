import { CARD_TYPE, SUITS } from "./constants.js";

export function createRng(seed) {
  if (!seed && seed !== 0) {
    return Math.random;
  }

  let state = normalizeSeed(seed);
  return function rng() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeSeed(seed) {
  if (typeof seed === "number") {
    return seed >>> 0;
  }

  return String(seed)
    .split("")
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0x9e3779b9);
}

export function fisherYatesShuffle(source, rng = Math.random) {
  const array = [...source];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

export function cardTypeForSuit(suit) {
  if (suit === SUITS.DIAMONDS) {
    return CARD_TYPE.WEAPON;
  }

  if (suit === SUITS.HEARTS) {
    return CARD_TYPE.POTION;
  }

  return CARD_TYPE.MONSTER;
}

export function cardLabel(card) {
  return `${card.suit}${formatValue(card.value)}`;
}

export function formatValue(value) {
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  if (value === 14) return "A";
  return String(value);
}
