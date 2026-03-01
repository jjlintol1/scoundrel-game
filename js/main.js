import { avoidRoom, createNewGame, resolveRoomCard } from "./game.js";
import { loadState, saveState } from "./storage.js";
import { animateResolvedCard, getDomRefs, render } from "./ui.js";

const dom = getDomRefs();
let state = null;
let isResolvingCard = false;

init();

function init() {
  bindControls();

  const savedState = loadState();
  if (savedState) {
    state = savedState;
    addLog("Loaded saved run.");
    sync();
    return;
  }

  startNewGame();
}

function bindControls() {
  dom.newGameBtn.addEventListener("click", () => {
    startNewGame();
  });

  dom.avoidBtn.addEventListener("click", () => {
    if (isResolvingCard) return;
    avoidRoom(state);
    sync();
  });

  dom.helpBtn.addEventListener("click", () => {
    if (!dom.helpModal.open) {
      dom.helpModal.showModal();
    }
  });

  dom.clearLogBtn.addEventListener("click", () => {
    state.log = [];
    sync();
  });

  dom.endModal.addEventListener("close", () => {
    dom.endModal.returnValue = "";
  });
}

async function onResolveCard(index, cardElement) {
  if (isResolvingCard || state.status !== "playing") return;

  isResolvingCard = true;
  dom.avoidBtn.disabled = true;

  try {
    await animateResolvedCard(cardElement);
    resolveRoomCard(state, index);
  } finally {
    isResolvingCard = false;
    sync();
  }
}

function startNewGame() {
  state = createNewGame();
  if (dom.endModal.open) {
    dom.endModal.close();
  }
  sync();
}

function sync() {
  render(state, dom, { onResolveCard });
  saveState(state);
}

function addLog(message) {
  state.log.unshift({
    message,
    at: new Date().toISOString(),
    turn: state?.turn ?? 0,
  });
}
