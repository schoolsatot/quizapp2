import {
  ref,
  update,
  remove,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { db, roomId } from "./firebase.js";
import { questionSets } from "./questions.js";

const $ = (id) => document.getElementById(id);

const questionInput = $("questionInput");
const choiceInputs = [$("choice1"), $("choice2"), $("choice3"), $("choice4")];
const answerSelect = $("answerSelect");

const setQuestionBtn = $("setQuestionBtn");
const closeBtn = $("closeBtn");
const showAnswersBtn = $("showAnswersBtn");
const markBtn = $("markBtn");
const scorePageBtn = $("scorePageBtn");
const resetAllBtn = $("resetAllBtn");

const statusText = $("statusText");
const currentQuestionText = $("currentQuestionText");
const answersArea = $("answersArea");

const questionSetSelect = $("questionSetSelect");
const presetQuestionSelect = $("presetQuestionSelect");
const setPresetQuestionBtn = $("setPresetQuestionBtn");

let roomData = {};

setQuestionBtn.addEventListener("click", async () => {
  const text = questionInput.value.trim();
  const choices = choiceInputs.map((input) => input.value.trim());
  const answerIndex = Number(answerSelect.value) - 1;

  if (!text || choices.some((choice) => !choice) || answerIndex < 0) {
    alert("問題文・選択肢・正解をすべて入力してください");
    return;
  }

  await setQuestion({
    text,
    choices,
    answer: choices[answerIndex]
  });
});

closeBtn.addEventListener("click", async () => {
  await update(ref(db, `rooms/${roomId}`), {
    status: "closed"
  });
});

showAnswersBtn.addEventListener("click", async () => {
  await update(ref(db, `rooms/${roomId}`), {
    showAnswers: true
  });
});

markBtn.addEventListener("click", async () => {
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  const data = snapshot.val();

  if (!data?.currentQuestion || !data?.answers) {
    alert("問題または回答がありません");
    return;
  }

  const correctAnswer = data.currentQuestion.answer;
  const updates = {};

  Object.entries(data.answers).forEach(([groupName, answerData]) => {
    const isCorrect = answerData.answer === correctAnswer;
    const currentScore = data.groups?.[groupName]?.score || 0;

    updates[`rooms/${roomId}/answers/${groupName}/correct`] = isCorrect;
    updates[`rooms/${roomId}/groups/${groupName}/score`] = isCorrect
      ? currentScore + 1
      : currentScore;
  });

  updates[`rooms/${roomId}/gradingId`] = Date.now();

  await update(ref(db), updates);
  alert("採点しました");
});

scorePageBtn.addEventListener("click", () => {
  window.location.href = "score.html";
});

resetAllBtn.addEventListener("click", async () => {
  if (!confirm("全データをリセットしますか？")) return;
  await remove(ref(db, `rooms/${roomId}`));
});

questionSetSelect.addEventListener("change", loadPresetQuestions);

setPresetQuestionBtn.addEventListener("click", async () => {
  const setName = questionSetSelect.value;
  const index = presetQuestionSelect.value;

  if (index === "") {
    alert("問題を選択してください");
    return;
  }

  const question = questionSets[setName][Number(index)];
  await setQuestion(question);
});

onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
  roomData = snapshot.val() || {};
  renderAdmin();
});

loadPresetQuestions();

async function setQuestion(question) {
  await update(ref(db, `rooms/${roomId}`), {
    currentQuestion: {
      text: question.text,
      choices: question.choices,
      answer: question.answer
    },
    status: "open",
    answers: null,
    showAnswers: false,
    gradingId: null,
    questionId: Date.now()
  });
}

function loadPresetQuestions() {
  const setName = questionSetSelect.value;
  const questions = questionSets[setName] || [];

  presetQuestionSelect.innerHTML = `<option value="">問題を選択</option>`;

  questions.forEach((question, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Q${index + 1}. ${question.text}`;
    presetQuestionSelect.appendChild(option);
  });
}

function renderAdmin() {
  statusText.textContent = roomData.status === "open"
    ? "回答受付中"
    : "締め切り中";

  currentQuestionText.textContent = roomData.currentQuestion?.text || "問題はまだありません";
  renderAnswers();
}

function renderAnswers() {
  answersArea.innerHTML = "";

  const answers = roomData.answers || {};

  if (Object.keys(answers).length === 0) {
    answersArea.textContent = "まだ回答はありません";
    return;
  }

  Object.entries(answers).forEach(([groupName, data]) => {
    const div = document.createElement("div");
    div.className = "answer-row";

    let result = "未採点";
    if (data.correct === true) result = "○";
    if (data.correct === false) result = "×";

    div.textContent = `${groupName}：${data.answer} ${result}`;
    answersArea.appendChild(div);
  });
}
