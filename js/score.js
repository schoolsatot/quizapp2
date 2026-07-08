import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { db, roomId } from "./firebase.js";

const rankingArea = document.getElementById("rankingArea");
const backBtn = document.getElementById("backBtn");

backBtn.addEventListener("click", () => {
  window.location.href = "admin.html";
});

onValue(ref(db, `rooms/${roomId}/groups`), (snapshot) => {
  const groups = snapshot.val() || {};
  renderRanking(groups);
});

function renderRanking(groups) {
  rankingArea.innerHTML = "";

  const entries = Object.entries(groups);

  if (entries.length === 0) {
    rankingArea.textContent = "まだ参加チームがありません";
    return;
  }

  const sortedEntries = entries.sort(
    (a, b) => (b[1].score || 0) - (a[1].score || 0)
  );

  let previousScore = null;
  let currentRank = 0;

  sortedEntries.forEach(([groupName, data], index) => {
    const score = data.score || 0;

    if (score !== previousScore) {
      currentRank = index + 1;
      previousScore = score;
    }

    const div = document.createElement("div");
    div.className = "ranking-row";

    // 同率1位は、これまでの1位と同じように大きく表示
    if (currentRank === 1) {
      div.classList.add("top-rank");
    }

    div.innerHTML = `
      <span class="rank">${currentRank}位</span>
      <span class="ranking-name">${groupName}</span>
      <span class="ranking-score">${score}点</span>
    `;

    rankingArea.appendChild(div);
  });
}
