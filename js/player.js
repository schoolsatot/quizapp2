import {
  ref,
  set,
  update,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { db, roomId } from "./firebase.js";

const $ = (id) => document.getElementById(id);

let myGroup = "";
let currentQuestion = null;
let status = "closed";
let hasJoined = false;
let lastGradingId = null;
let lastQuestionText = "";
let lastQuestionId = null;

const joinArea = $("joinArea");
const quizArea = $("quizArea");
const allAnswersArea = $("allAnswersArea");
const allAnswersList = $("allAnswersList");

const groupNameInput = $("groupName");
const joinBtn = $("joinBtn");
const statusText = $("statusText");
const waitingSpinner = $("waitingSpinner");
const questionText = $("questionText");
const choicesDiv = $("choices");

const questionSound = $("questionSound");
const correctSound = $("correctSound");
const wrongSound = $("wrongSound");

joinBtn.addEventListener("click", async () => {
  const name = groupNameInput.value.trim();

  if (!name) {
    alert("チーム名を入力してください");
    return;
  }

  myGroup = name;
  hasJoined = true;

  unlockSound(questionSound);
  unlockSound(correctSound);
  unlockSound(wrongSound);

  await update(ref(db, `rooms/${roomId}/groups/${myGroup}`), {
    score: 0
  });

  joinArea.classList.add("hidden");
  quizArea.classList.remove("hidden");
});

onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
  if (!hasJoined) {
    showJoinOnly();
    return;
  }

  const data = snapshot.val();

  if (!data) {
    questionText.textContent = "問題を待っています";
    statusText.textContent = "開始を待っています";
    waitingSpinner.classList.remove("hidden");
    quizArea.classList.remove("hidden");
    allAnswersArea.classList.add("hidden");
    return;
  }

  currentQuestion = data.currentQuestion || null;
  status = data.status || "closed";

  if (
    data.questionId &&
    data.questionId !== lastQuestionId
  ) {
    lastQuestionId = data.questionId;
    playSound(questionSound);
  }

  renderQuiz(data);
  playResultSoundIfNeeded(data);

  if (data.showAnswers) {
    quizArea.classList.add("hidden");
    allAnswersArea.classList.remove("hidden");
    renderAllAnswers(data.answers || {});
  } else {
    quizArea.classList.remove("hidden");
    allAnswersArea.classList.add("hidden");
  }
});

function showJoinOnly() {
  joinArea.classList.remove("hidden");
  quizArea.classList.add("hidden");
  allAnswersArea.classList.add("hidden");
}

function renderQuiz(data) {
  choicesDiv.innerHTML = "";

  if (!currentQuestion) {
    questionText.textContent = "問題を待っています";
    statusText.textContent = "開始を待っています";
    waitingSpinner.classList.remove("hidden");
    return;
  }

  questionText.textContent = currentQuestion.text;

  if (currentQuestion.text !== lastQuestionText) {
    lastQuestionText = currentQuestion.text;
    playSound(questionSound);
  }

  if (status === "open") {
    statusText.textContent = "回答受付中です";
    waitingSpinner.classList.add("hidden");
  } else {
    statusText.textContent = "開始を待っています";
    waitingSpinner.classList.remove("hidden");
  }

  const myAnswer = data.answers?.[myGroup];

  currentQuestion.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice;
    button.className = "choice-btn";
    button.disabled = status !== "open" || !!myAnswer;

    button.addEventListener("click", async () => {
      if (status !== "open") return;

      await set(ref(db, `rooms/${roomId}/answers/${myGroup}`), {
        answer: choice,
        correct: null
      });
    });

    choicesDiv.appendChild(button);
  });
}

function renderAllAnswers(answers) {
  allAnswersList.innerHTML = "";

  const entries = Object.entries(answers);

  if (entries.length === 0) {
    allAnswersList.textContent = "まだ回答はありません";
    return;
  }

  entries.forEach(([groupName, data]) => {
    const div = document.createElement("div");
    div.className = "answer-row";

    let resultText = "";
    let resultClass = "";

    if (data.correct === true) {
      resultText = "○";
      resultClass = "correct";
    } else if (data.correct === false) {
      resultText = "×";
      resultClass = "wrong";
    }

    div.innerHTML = `
      <span class="group-name">${groupName}</span>
      <span class="answer-text">${data.answer}</span>
      <span class="result ${resultClass}">${resultText}</span>
    `;

    allAnswersList.appendChild(div);
  });
}

function playResultSoundIfNeeded(data) {
  if (!data.gradingId || data.gradingId === lastGradingId) return;

  lastGradingId = data.gradingId;
  const myAnswer = data.answers?.[myGroup];

  if (myAnswer?.correct === true) {
    playSound(correctSound);
  } else if (myAnswer?.correct === false) {
    playSound(wrongSound);
  }
}

function unlockSound(audio) {
  audio.volume = 0.8;
  audio.play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => {});
}

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
