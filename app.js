const storageKey = "timezone-friends-v2";

const copy = {
  emptyInitial: "\u8fd8\u6ca1\u6709\u670b\u53cb",
  emptyPlace: "\u5148\u4ece\u4e0b\u9762\u6dfb\u52a0\u4e00\u4e2a\u670b\u53cb",
  emptyTime: "--:--",
  emptyPhase: "\u7a7a\u7a7a\u7684\u5c0f\u5b87\u5b99",
  emptyMood: "\u6dfb\u52a0\u670b\u53cb\u540e\u5c31\u80fd\u770b\u5230\u72b6\u6001",
  emptyWindow: "\u672a\u8bbe\u7f6e",
  noNotes: "\u8fd8\u6ca1\u6709\u7eb8\u6761\u3002\u5148\u6dfb\u52a0\u4e00\u4e2a\u670b\u53cb\u5427\u3002",
  localSave: "\u672c\u5730\u4fdd\u5b58",
  noAwake: "\u6682\u65f6\u8fd8\u6ca1\u6709\u670b\u53cb\u5728\u7ebf\u3002",
  noFriendForNote: "\u5148\u6dfb\u52a0\u4e00\u4e2a\u670b\u53cb\uff0c\u518d\u6295\u9012\u5c0f\u7eb8\u6761\u3002",
  noMood: "\u4eca\u5929\u8fd8\u6ca1\u53d1\u72b6\u6001",
  noWindow: "\u672a\u8bbe\u7f6e\u804a\u5929\u65f6\u95f4",
  newFriend: "\u65b0\u670b\u53cb",
  nowIs: "\u73b0\u5728\u662f",
  deepNight: "\u6df1\u591c",
  morning: "\u65e9\u6668",
  noon: "\u5348\u95f4",
  afternoon: "\u4e0b\u5348",
  evening: "\u665a\u4e0a",
  night: "\u591c\u91cc"
};

let friends = loadFriends();
let activeId = friends[0]?.id || null;

const el = {
  ribbon: document.querySelector("#timeRibbon"),
  orbit: document.querySelector("#friendOrbit"),
  activeAvatar: document.querySelector("#activeAvatar"),
  activeName: document.querySelector("#activeName"),
  activePlace: document.querySelector("#activePlace"),
  activeTime: document.querySelector("#activeTime"),
  activePhase: document.querySelector("#activePhase"),
  activeMood: document.querySelector("#activeMood"),
  activeWindow: document.querySelector("#activeWindow"),
  noteCount: document.querySelector("#noteCount"),
  notesList: document.querySelector("#notesList"),
  noteForm: document.querySelector("#noteForm"),
  noteInput: document.querySelector("#noteInput"),
  awakeCount: document.querySelector("#awakeCount"),
  awakeList: document.querySelector("#awakeList"),
  friendForm: document.querySelector("#friendForm"),
  resetDemo: document.querySelector("#resetDemo")
};

function loadFriends() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveFriends() {
  localStorage.setItem(storageKey, JSON.stringify(friends));
}

function localDate(zone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return { hour, minute, label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function phaseFor(hour) {
  if (hour < 6) return copy.deepNight;
  if (hour < 11) return copy.morning;
  if (hour < 14) return copy.noon;
  if (hour < 18) return copy.afternoon;
  if (hour < 22) return copy.evening;
  return copy.night;
}

function renderRibbon() {
  const localHour = new Date().getHours();
  el.ribbon.innerHTML = "";
  for (let hour = 0; hour < 24; hour += 1) {
    const cell = document.createElement("div");
    cell.className = `hour-cell${hour === localHour ? " is-now" : ""}`;
    cell.innerHTML = `<strong>${String(hour).padStart(2, "0")}</strong><span>${phaseFor(hour)}</span>`;
    el.ribbon.appendChild(cell);
  }
}

function renderOrbit() {
  el.orbit.innerHTML = "";
  friends.forEach((friend, index) => {
    const button = document.createElement("button");
    button.className = `friend-planet${friend.id === activeId ? " active" : ""}`;
    button.style.left = `${friend.pos?.[0] ?? 25 + index * 13}%`;
    button.style.top = `${friend.pos?.[1] ?? 45 + (index % 2) * 12}%`;
    const time = localDate(friend.zone);
    button.innerHTML = `
      <span class="planet-avatar">${escapeHtml(friend.name.slice(0, 1).toUpperCase())}</span>
      <span class="planet-name">${escapeHtml(friend.name)}</span>
      <span class="planet-meta">${escapeHtml(friend.city)}</span>
      <span class="planet-meta">${time.label} · ${phaseFor(time.hour)}</span>
    `;
    button.addEventListener("click", () => {
      activeId = friend.id;
      render();
    });
    el.orbit.appendChild(button);
  });
}

function renderActive() {
  const friend = friends.find((item) => item.id === activeId) || friends[0];
  if (!friend) {
    el.activeAvatar.textContent = "+";
    el.activeName.textContent = copy.emptyInitial;
    el.activePlace.textContent = copy.emptyPlace;
    el.activeTime.textContent = copy.emptyTime;
    el.activePhase.textContent = copy.emptyPhase;
    el.activeMood.textContent = copy.emptyMood;
    el.activeWindow.textContent = copy.emptyWindow;
    el.noteCount.textContent = "0";
    el.notesList.innerHTML = `<article class="note">${copy.noNotes}<small>${copy.localSave}</small></article>`;
    return;
  }

  const time = localDate(friend.zone);
  el.activeAvatar.textContent = friend.name.slice(0, 1).toUpperCase();
  el.activeName.textContent = friend.name;
  el.activePlace.textContent = `${friend.city} · ${friend.zone}`;
  el.activeTime.textContent = time.label;
  el.activePhase.textContent = phaseFor(time.hour);
  el.activeMood.textContent = friend.mood || copy.noMood;
  el.activeWindow.textContent = friend.window || copy.noWindow;
  el.noteCount.textContent = String(friend.notes.length);
  el.notesList.innerHTML = friend.notes.length
    ? friend.notes.map((note) => `<article class="note">${escapeHtml(note.text)}<small>${escapeHtml(note.at)}</small></article>`).join("")
    : `<article class="note">${copy.noNotes}<small>${copy.localSave}</small></article>`;
}

function renderAwake() {
  const awake = friends.filter((friend) => {
    const { hour } = localDate(friend.zone);
    return hour >= 8 && hour <= 23;
  });
  el.awakeCount.textContent = String(awake.length);
  el.awakeList.innerHTML = awake.length
    ? awake
        .map((friend) => {
          const time = localDate(friend.zone);
          return `<article class="awake-item"><strong>${escapeHtml(friend.name)}</strong> ${copy.nowIs} ${time.label}<small>${escapeHtml(friend.city)} · ${escapeHtml(friend.mood)}</small></article>`;
        })
        .join("")
    : `<article class="awake-item">${copy.noAwake}<small>${copy.localSave}</small></article>`;
}

function render() {
  renderRibbon();
  renderOrbit();
  renderActive();
  renderAwake();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

el.noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = el.noteInput.value.trim();
  if (!text) return;
  const friend = friends.find((item) => item.id === activeId);
  if (!friend) {
    alert(copy.noFriendForNote);
    return;
  }
  friend.notes.unshift({ text, at: new Date().toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) });
  friend.notes = friend.notes.slice(0, 6);
  el.noteInput.value = "";
  saveFriends();
  render();
});

el.friendForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = document.querySelector("#friendName").value.trim();
  const city = document.querySelector("#friendCity").value.trim();
  const zone = document.querySelector("#friendZone").value;
  const windowText = document.querySelector("#friendWindow").value.trim() || "19:00-22:00";
  const id = `${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "friend"}-${Date.now()}`;
  const pos = [18 + Math.random() * 64, 30 + Math.random() * 42];
  friends.push({ id, name, city, zone, mood: copy.newFriend, window: windowText, pos, notes: [] });
  activeId = id;
  saveFriends();
  form.reset();
  render();
});

el.resetDemo.addEventListener("click", () => {
  friends = [];
  activeId = null;
  saveFriends();
  render();
});

render();
setInterval(render, 30000);
