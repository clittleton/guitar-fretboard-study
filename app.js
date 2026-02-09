const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_ALIASES = {
  "B#": "C",
  "CB": "B",
  "DB": "C#",
  "EB": "D#",
  "E#": "F",
  "FB": "E",
  "GB": "F#",
  "AB": "G#",
  "BB": "A#"
};

const NOTE_BUTTONS = [
  { label: "C", value: "C" },
  { label: "C#/Db", value: "C#" },
  { label: "D", value: "D" },
  { label: "D#/Eb", value: "D#" },
  { label: "E", value: "E" },
  { label: "F", value: "F" },
  { label: "F#/Gb", value: "F#" },
  { label: "G", value: "G" },
  { label: "G#/Ab", value: "G#" },
  { label: "A", value: "A" },
  { label: "A#/Bb", value: "A#" },
  { label: "B", value: "B" }
];

const STRING_INFO = [
  { number: 6, letter: "E", promptName: "6th string (low E)" },
  { number: 5, letter: "A", promptName: "5th string (A)" },
  { number: 4, letter: "D", promptName: "4th string (D)" },
  { number: 3, letter: "G", promptName: "3rd string (G)" },
  { number: 2, letter: "B", promptName: "2nd string (B)" },
  { number: 1, letter: "E", promptName: "1st string (high E)" }
];

const OPEN_NOTE_INDEX = [4, 9, 2, 7, 11, 4]; // E A D G B E
const STRING_BUTTONS = ["E", "A", "D", "G", "B"];
const MAX_FRET = 12;

const state = {
  active: false,
  answerLocked: false,
  questionTypes: [],
  currentQuestion: null,
  score: { correct: 0, total: 0 },
  session: {
    mode: "free",
    minutes: 2,
    questionLimit: 30,
    completedQuestions: 0,
    wrongAnswerMode: "reveal-next",
    endTimestamp: 0,
    timerId: null
  },
  boardCells: new Map()
};

const els = {
  scoreFraction: document.getElementById("scoreFraction"),
  scorePercent: document.getElementById("scorePercent"),
  timerValue: document.getElementById("timerValue"),
  studyMode: document.getElementById("studyMode"),
  minutesField: document.getElementById("minutesField"),
  questionCountField: document.getElementById("questionCountField"),
  minutesInput: document.getElementById("minutesInput"),
  questionCountInput: document.getElementById("questionCountInput"),
  questionTypeChecks: Array.from(document.querySelectorAll(".question-types input[type='checkbox']")),
  wrongAnswerModeChecks: Array.from(document.querySelectorAll("input[name='wrongAnswerMode']")),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsDialog: document.getElementById("settingsDialog"),
  startBtn: document.getElementById("startBtn"),
  endBtn: document.getElementById("endBtn"),
  sessionInfo: document.getElementById("sessionInfo"),
  questionPrompt: document.getElementById("questionPrompt"),
  promptCard: document.getElementById("promptCard"),
  answerArea: document.getElementById("answerArea"),
  feedback: document.getElementById("feedback"),
  fretboardContainer: document.getElementById("fretboardContainer")
};

initialize();

function initialize() {
  buildFretboard();
  wireEvents();
  syncModeFields();
  updateScore();
}

function wireEvents() {
  els.studyMode.addEventListener("change", syncModeFields);
  els.settingsBtn.addEventListener("click", openSettings);
  els.startBtn.addEventListener("click", startSession);
  els.endBtn.addEventListener("click", () => endSession("Session ended."));
}

function buildFretboard() {
  state.boardCells.clear();

  const visual = document.createElement("div");
  visual.className = "fretboard-visual";

  const numbers = document.createElement("div");
  numbers.className = "fret-numbers";
  const spacer = document.createElement("span");
  spacer.className = "fret-num-spacer";
  numbers.appendChild(spacer);
  const openLabel = document.createElement("span");
  openLabel.className = "fret-num open-num";
  openLabel.textContent = "";
  numbers.appendChild(openLabel);
  for (let fret = 1; fret <= MAX_FRET; fret += 1) {
    const label = document.createElement("span");
    label.className = "fret-num";
    label.textContent = String(fret);
    numbers.appendChild(label);
  }

  const main = document.createElement("div");
  main.className = "fretboard-main";

  const labels = document.createElement("div");
  labels.className = "string-labels";

  const neck = document.createElement("div");
  neck.className = "neck";

  const fretLines = document.createElement("div");
  fretLines.className = "fret-lines";
  for (let line = 0; line <= MAX_FRET + 1; line += 1) {
    const lineEl = document.createElement("span");
    lineEl.className = "fret-line";
    if (line === 1) lineEl.classList.add("nut");
    lineEl.style.left = `${(line / (MAX_FRET + 1)) * 100}%`;
    fretLines.appendChild(lineEl);
  }

  const markers = document.createElement("div");
  markers.className = "fret-markers";
  [3, 5, 7, 9].forEach((fret) => {
    const marker = document.createElement("span");
    marker.className = "marker";
    marker.style.left = `${((fret + 0.5) / (MAX_FRET + 1)) * 100}%`;
    marker.style.top = "50%";
    markers.appendChild(marker);
  });
  [34, 66].forEach((top) => {
    const marker = document.createElement("span");
    marker.className = "marker";
    marker.style.left = `${((12 + 0.5) / (MAX_FRET + 1)) * 100}%`;
    marker.style.top = `${top}%`;
    markers.appendChild(marker);
  });

  const strings = document.createElement("div");
  strings.className = "string-lines";

  const hitGrid = document.createElement("div");
  hitGrid.className = "fret-hit-grid";

  const displayOrder = [5, 4, 3, 2, 1, 0];
  const stringGauge = [1.2, 1.4, 1.7, 2, 2.4, 2.9];

  displayOrder.forEach((stringIndex, rowIndex) => {
    const info = STRING_INFO[stringIndex];
    const label = document.createElement("span");
    label.className = "string-name";
    label.textContent = `${info.number} • ${info.promptName}`;
    labels.appendChild(label);

    const stringLine = document.createElement("span");
    stringLine.className = "string-line";
    stringLine.style.top = `${((rowIndex + 0.5) / 6) * 100}%`;
    stringLine.style.height = `${stringGauge[rowIndex]}px`;
    strings.appendChild(stringLine);

    for (let fret = 0; fret <= MAX_FRET; fret += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fret-cell";
      button.dataset.string = String(stringIndex);
      button.dataset.fret = String(fret);
      button.setAttribute("aria-label", `${info.promptName}, fret ${fret}`);
      hitGrid.appendChild(button);
      state.boardCells.set(cellKey(stringIndex, fret), button);
    }
  });

  neck.append(fretLines, markers, strings, hitGrid);
  main.append(labels, neck);
  visual.append(numbers, main);

  neck.addEventListener("click", handleFretboardClick);
  els.fretboardContainer.replaceChildren(visual);
}

function syncModeFields() {
  const mode = els.studyMode.value;
  const timed = mode === "timed" || mode === "timed-questions";
  const numbered = mode === "questions" || mode === "timed-questions";

  els.minutesInput.disabled = !timed;
  els.questionCountInput.disabled = !numbered;
  els.minutesField.classList.toggle("is-disabled", !timed);
  els.questionCountField.classList.toggle("is-disabled", !numbered);
}

function startSession() {
  const selectedTypes = getSelectedQuestionTypes();
  if (!selectedTypes.length) {
    setFeedback("Select at least one question type to begin.", "bad");
    return;
  }

  const minutes = Math.max(1, Number.parseInt(els.minutesInput.value, 10) || 1);
  const questionLimit = Math.max(1, Number.parseInt(els.questionCountInput.value, 10) || 1);

  state.active = true;
  state.answerLocked = false;
  state.questionTypes = selectedTypes;
  state.currentQuestion = null;
  state.score.correct = 0;
  state.score.total = 0;
  state.session.mode = els.studyMode.value;
  state.session.minutes = minutes;
  state.session.questionLimit = questionLimit;
  state.session.completedQuestions = 0;
  state.session.wrongAnswerMode = getWrongAnswerMode();

  clearTimer();
  if (isTimedMode(state.session.mode)) {
    state.session.endTimestamp = Date.now() + state.session.minutes * 60 * 1000;
    state.session.timerId = window.setInterval(updateTimer, 250);
    updateTimer();
  } else {
    state.session.endTimestamp = 0;
    els.timerValue.textContent = "No limit";
  }

  updateScore();
  clearBoardMarkers();
  setFeedback("", "neutral");
  els.startBtn.disabled = true;
  els.endBtn.disabled = false;
  els.sessionInfo.textContent = buildSessionInfo();

  nextQuestion();
}

function endSession(message) {
  if (!state.active) return;
  state.active = false;
  state.answerLocked = true;
  clearTimer();
  state.currentQuestion = null;
  clearBoardMarkers();
  els.startBtn.disabled = false;
  els.endBtn.disabled = true;
  els.questionPrompt.textContent = "Ready for another round?";
  els.answerArea.replaceChildren(paragraph("Press Start Session when you are ready."));
  els.sessionInfo.textContent = "Choose settings, then press Start Session.";
  setFeedback(
    `${message} Final score: ${state.score.correct}/${state.score.total} (${scorePercentText()}).`,
    "neutral"
  );
}

function clearTimer() {
  if (state.session.timerId) {
    window.clearInterval(state.session.timerId);
    state.session.timerId = null;
  }
}

function updateTimer() {
  if (!state.active) return;
  const remainingMs = state.session.endTimestamp - Date.now();
  const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
  els.timerValue.textContent = formatSeconds(remaining);
  if (remaining <= 0) {
    endSession("Time is up.");
  }
}

function nextQuestion() {
  if (!state.active) return;
  state.answerLocked = false;
  setFeedback("", "neutral");
  const question = generateQuestion();
  state.currentQuestion = question;
  renderQuestion(question);
}

function generateQuestion() {
  const questionType = randomChoice(state.questionTypes);
  if (questionType === "note-id") {
    const stringIndex = randomInt(0, STRING_INFO.length - 1);
    const fret = randomInt(0, MAX_FRET);
    return {
      type: "note-id",
      prompt: "Name the note shown by the red dot.",
      stringIndex,
      fret,
      answer: noteAt(stringIndex, fret)
    };
  }

  if (questionType === "find-note") {
    const stringIndex = randomInt(0, STRING_INFO.length - 1);
    const fret = randomInt(0, MAX_FRET - 1);
    const answer = noteAt(stringIndex, fret);
    return {
      type: "find-note",
      prompt: `Click ${answer} on the ${STRING_INFO[stringIndex].promptName}.`,
      stringIndex,
      fret,
      answer
    };
  }

  const stringIndex = randomInt(0, STRING_INFO.length - 1);
  const fret = randomInt(1, MAX_FRET);
  const note = noteAt(stringIndex, fret);
  const validLetters = Array.from(new Set(
    STRING_INFO
      .filter((_, idx) => noteAt(idx, fret) === note)
      .map((item) => item.letter)
  ));

  return {
    type: "name-string",
    prompt: `What string has ${note} on the ${ordinal(fret)} fret?`,
    fret,
    note,
    answers: validLetters,
    wrongSelections: new Set()
  };
}

function renderQuestion(question) {
  els.questionPrompt.textContent = question.prompt;
  renderAnswerArea(question);
  renderBoard(question);
}

function renderAnswerArea(question) {
  if (question.type === "note-id") {
    const wrapper = document.createElement("div");
    const form = document.createElement("form");
    form.className = "answer-row";
    const input = document.createElement("input");
    input.placeholder = "Type note (example: F# or Bb)";
    input.autocomplete = "off";
    input.maxLength = 4;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "submit-btn";
    submit.textContent = "Submit";
    form.append(input, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitAnswer(input.value);
      input.focus();
    });

    const choices = document.createElement("div");
    choices.className = "choice-grid";
    NOTE_BUTTONS.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = option.label;
      btn.addEventListener("click", () => submitAnswer(option.value));
      choices.appendChild(btn);
    });

    wrapper.append(form, choices);
    els.answerArea.replaceChildren(wrapper);
    window.setTimeout(() => input.focus(), 0);
    return;
  }

  if (question.type === "name-string") {
    const wrapper = document.createElement("div");
    wrapper.appendChild(paragraph("Answer with the string letter."));
    const choices = document.createElement("div");
    choices.className = "choice-grid strings";
    STRING_BUTTONS.forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = letter;
      if (question.wrongSelections && question.wrongSelections.has(letter)) {
        btn.classList.add("wrong-choice");
      }
      btn.addEventListener("click", () => submitAnswer(letter, btn));
      choices.appendChild(btn);
    });
    wrapper.appendChild(choices);
    els.answerArea.replaceChildren(wrapper);
    return;
  }

  els.answerArea.replaceChildren(paragraph("Click a fret on the board to answer."));
}

function renderBoard(question) {
  clearBoardMarkers();
  if (question.type === "note-id") {
    const targetCell = state.boardCells.get(cellKey(question.stringIndex, question.fret));
    if (targetCell) {
      targetCell.classList.add("has-dot");
    }
  }
}

function clearBoardMarkers() {
  state.boardCells.forEach((button) => {
    button.classList.remove("has-dot", "correct-hit", "wrong-hit");
  });
}

function submitAnswer(rawAnswer, sourceButton = null) {
  if (!state.active || state.answerLocked || !state.currentQuestion) return;
  const question = state.currentQuestion;

  if (question.type === "find-note") {
    return;
  }

  let isCorrect = false;
  if (question.type === "note-id") {
    const note = normalizeNote(rawAnswer);
    if (!note) {
      setFeedback("Enter a note name (example: C, F#, Bb).", "bad");
      return;
    }
    isCorrect = note === question.answer;
    const markerCell = state.boardCells.get(cellKey(question.stringIndex, question.fret));
    if (markerCell) {
      markerCell.classList.remove("has-dot", "correct-hit", "wrong-hit");
      const markerClass = isCorrect || state.session.wrongAnswerMode === "reveal-next"
        ? "correct-hit"
        : "wrong-hit";
      markerCell.classList.add(markerClass);
    }
  } else {
    const letter = normalizeStringLetter(rawAnswer);
    if (!letter) {
      setFeedback("Use a string letter (E, A, D, G, or B).", "bad");
      return;
    }
    isCorrect = question.answers.includes(letter);
    const stringButtons = Array.from(els.answerArea.querySelectorAll(".choice-grid.strings button"));
    stringButtons.forEach((button) => {
      button.classList.remove("picked-correct", "correct-choice");
      const text = String(button.textContent || "").trim().toUpperCase();
      if (question.answers.includes(text) && (isCorrect || state.session.wrongAnswerMode === "reveal-next")) {
        button.classList.add("correct-choice");
      }
    });
    if (!isCorrect) {
      question.wrongSelections.add(letter);
      if (sourceButton) {
        sourceButton.classList.remove("correct-choice");
        sourceButton.classList.add("wrong-choice");
      }
    } else if (sourceButton) {
      stringButtons.forEach((button) => button.classList.remove("wrong-choice"));
      sourceButton.classList.remove("correct-choice");
      sourceButton.classList.add("picked-correct");
    }
  }

  gradeQuestion(isCorrect);
}

function handleFretboardClick(event) {
  const target = event.target.closest(".fret-cell");
  if (!target || !state.active || state.answerLocked || !state.currentQuestion) return;
  if (state.currentQuestion.type !== "find-note") return;

  const clickedString = Number(target.dataset.string);
  const clickedFret = Number(target.dataset.fret);
  const question = state.currentQuestion;
  const isCorrect = clickedString === question.stringIndex && clickedFret === question.fret;
  const retryMode = state.session.wrongAnswerMode === "retry-until-correct";

  clearBoardMarkers();
  target.classList.add(isCorrect ? "correct-hit" : "wrong-hit");
  if (!isCorrect && !retryMode) {
    const correctCell = state.boardCells.get(cellKey(question.stringIndex, question.fret));
    if (correctCell) correctCell.classList.add("correct-hit");
  }

  gradeQuestion(isCorrect);
}

function gradeQuestion(isCorrect) {
  if (!state.currentQuestion || state.answerLocked) return;
  const question = state.currentQuestion;
  const retryMode = state.session.wrongAnswerMode === "retry-until-correct";

  state.score.total += 1;
  if (isCorrect) state.score.correct += 1;
  updateScore();

  if (isCorrect) {
    state.answerLocked = true;
    setFeedback("Correct.", "good");
    state.session.completedQuestions += 1;
  } else {
    if (retryMode) {
      state.answerLocked = false;
      setFeedback("Incorrect. Try again.", "bad");
      return;
    }
    state.answerLocked = true;
    setFeedback(`Incorrect. ${correctAnswerText(question)}`, "bad");
    state.session.completedQuestions += 1;
  }

  if (isQuestionLimitMode(state.session.mode) && state.session.completedQuestions >= state.session.questionLimit) {
    endSession("Question goal reached.");
    return;
  }

  window.setTimeout(() => {
    if (!state.active) return;
    nextQuestion();
  }, 950);
}

function correctAnswerText(question) {
  if (question.type === "note-id") {
    return `The note is ${question.answer}.`;
  }
  if (question.type === "find-note") {
    return `${question.answer} is on fret ${question.fret} of the ${STRING_INFO[question.stringIndex].promptName}.`;
  }
  return `The correct string is ${question.answers.join(" or ")}.`;
}

function getSelectedQuestionTypes() {
  return els.questionTypeChecks
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function getWrongAnswerMode() {
  const selected = els.wrongAnswerModeChecks.find((input) => input.checked);
  return selected ? selected.value : "reveal-next";
}

function updateScore() {
  els.scoreFraction.textContent = `${state.score.correct} / ${state.score.total}`;
  els.scorePercent.textContent = scorePercentText();
}

function scorePercentText() {
  if (state.score.total === 0) return "0.0%";
  return `${((state.score.correct / state.score.total) * 100).toFixed(1)}%`;
}

function setFeedback(text, kind) {
  els.feedback.textContent = text;
  els.feedback.className = "feedback";
  els.promptCard.classList.remove("result-good", "result-bad");
  if (kind) els.feedback.classList.add(kind);
  if (kind === "good") els.promptCard.classList.add("result-good");
  if (kind === "bad") els.promptCard.classList.add("result-bad");
}

function buildSessionInfo() {
  const modeLabel = {
    free: "Free Study",
    timed: "Timed",
    questions: "Question Count",
    "timed-questions": "Timed + Question Count"
  }[state.session.mode];

  const details = [modeLabel];
  if (isTimedMode(state.session.mode)) {
    details.push(`${state.session.minutes} min`);
  }
  if (isQuestionLimitMode(state.session.mode)) {
    details.push(`${state.session.questionLimit} questions`);
  }
  details.push(state.session.wrongAnswerMode === "reveal-next" ? "Reveal + next" : "Retry until correct");
  return `Running: ${details.join(" | ")}`;
}

function isTimedMode(mode) {
  return mode === "timed" || mode === "timed-questions";
}

function isQuestionLimitMode(mode) {
  return mode === "questions" || mode === "timed-questions";
}

function noteAt(stringIndex, fret) {
  const noteIndex = (OPEN_NOTE_INDEX[stringIndex] + fret) % 12;
  return NOTES_SHARP[noteIndex];
}

function normalizeNote(raw) {
  if (!raw) return "";
  let token = String(raw)
    .trim()
    .toUpperCase()
    .replace(/SHARP/g, "#")
    .replace(/FLAT/g, "B")
    .replace(/\s+/g, "")
    .replace("♯", "#")
    .replace("♭", "B");

  if (NOTES_SHARP.includes(token)) return token;
  if (NOTE_ALIASES[token]) return NOTE_ALIASES[token];
  return "";
}

function normalizeStringLetter(raw) {
  if (!raw) return "";
  const letter = String(raw).trim().toUpperCase();
  if (STRING_BUTTONS.includes(letter)) return letter;
  return "";
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ordinal(value) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

function paragraph(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[randomInt(0, items.length - 1)];
}

function cellKey(stringIndex, fret) {
  return `${stringIndex}:${fret}`;
}

function openSettings() {
  if (typeof els.settingsDialog.showModal === "function") {
    els.settingsDialog.showModal();
    return;
  }
  els.settingsDialog.setAttribute("open", "open");
}
