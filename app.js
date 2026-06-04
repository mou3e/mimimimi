const config = window.MIMIMIMI_SUPABASE || {};
const hasConfig = Boolean(config.url && config.anonKey && !config.anonKey.includes("PASTE_"));
const storageKey = "mimimimi-supabase-profile-id";

const text = {
  connected: "\u5df2\u540c\u6b65",
  disconnected: "\u672a\u8fde\u63a5",
  reading: "\u6b63\u5728\u8bfb\u53d6\u6700\u65b0\u72b6\u6001...",
  readOk: "\u5df2\u8bfb\u53d6\u6700\u65b0\u72b6\u6001\u3002",
  realtimeOk: "\u5b9e\u65f6\u540c\u6b65\u5df2\u8fde\u63a5\u3002",
  noConfig: "\u8bf7\u5148\u5728 config.js \u91cc\u586b Supabase anon public key\u3002",
  noClient: "\u8fd8\u6ca1\u8fde\u4e0a Supabase\u3002",
  needNameCity: "\u540d\u5b57\u548c\u57ce\u5e02\u90fd\u8981\u586b\u3002",
  saveOk: "\u4fdd\u5b58\u597d\u4e86\uff0c\u670b\u53cb\u4eec\u5237\u65b0\u540e\u5c31\u80fd\u770b\u5230\u3002",
  noMood: "\u4eca\u5929\u8fd8\u6ca1\u53d1\u72b6\u6001",
  noWindow: "\u672a\u8bbe\u7f6e\u804a\u5929\u65f6\u95f4",
  noNote: "\u6ca1\u6709\u5c0f\u7eb8\u6761\u3002",
  noFriends: "\u8fd8\u6ca1\u6709\u670b\u53cb\u52a0\u5165\u3002",
  noMessages: "\u8fd8\u6ca1\u6709\u7559\u8a00\u3002",
  newFriend: "\u65b0\u670b\u53cb",
  messageSent: "\u7559\u8a00\u5df2\u53d1\u9001\u3002",
  anonymous: "\u533f\u540d",
  updatedAt: "\u66f4\u65b0\u4e8e",
  deepNight: "\u6df1\u591c",
  morning: "\u65e9\u6668",
  noon: "\u5348\u95f4",
  afternoon: "\u4e0b\u5348",
  evening: "\u665a\u4e0a",
  night: "\u591c\u91cc"
};

const zoneLabels = {
  "America/Toronto": "Canada / Toronto",
  "America/New_York": "USA / New York",
  "America/Los_Angeles": "USA / California",
  "Asia/Shanghai": "China / Kunming",
  "Europe/London": "UK / London",
  "Europe/Paris": "France / Paris",
  "Asia/Tokyo": "Japan / Tokyo",
  "Australia/Sydney": "Australia / Sydney"
};

const el = {
  form: document.querySelector("#profileForm"),
  name: document.querySelector("#nameInput"),
  city: document.querySelector("#cityInput"),
  zone: document.querySelector("#zoneInput"),
  mood: document.querySelector("#moodInput"),
  window: document.querySelector("#windowInput"),
  note: document.querySelector("#noteInput"),
  status: document.querySelector("#statusText"),
  list: document.querySelector("#friendsList"),
  friendCount: document.querySelector("#friendCount"),
  awakeCount: document.querySelector("#awakeCount"),
  refresh: document.querySelector("#refreshButton"),
  liveBadge: document.querySelector("#liveBadge"),
  messageForm: document.querySelector("#messageForm"),
  messageName: document.querySelector("#messageNameInput"),
  message: document.querySelector("#messageInput"),
  messagesList: document.querySelector("#messagesList")
};

let client = null;
let currentId = localStorage.getItem(storageKey);
let rows = [];
let messages = [];

function setStatus(value, isError = false) {
  el.status.textContent = value;
  el.liveBadge.textContent = isError ? text.disconnected : text.connected;
  el.liveBadge.classList.toggle("error", isError);
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
  if (hour < 6) return text.deepNight;
  if (hour < 11) return text.morning;
  if (hour < 14) return text.noon;
  if (hour < 18) return text.afternoon;
  if (hour < 22) return text.evening;
  return text.night;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortTime(value) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "";
}

function renderFriends() {
  const decorated = rows.map((friend) => {
    const zone = friend.zone || "America/Toronto";
    const time = localDate(zone);
    return { ...friend, zone, zoneLabel: zoneLabels[zone] || zone, time, phase: phaseFor(time.hour) };
  });

  el.friendCount.textContent = String(decorated.length);
  el.awakeCount.textContent = String(decorated.filter((friend) => friend.time.hour >= 8 && friend.time.hour <= 23).length);

  if (!decorated.length) {
    el.list.innerHTML = `<article class="empty">${text.noFriends}</article>`;
    return;
  }

  el.list.innerHTML = decorated
    .map((friend) => {
      return `
        <article class="friendCard">
          <div class="friendTop">
            <span class="avatar">${escapeHtml(friend.name).slice(0, 1).toUpperCase() || "?"}</span>
            <span class="friendTime">${friend.time.label}</span>
          </div>
          <strong class="friendName">${escapeHtml(friend.name)}</strong>
          <span class="friendMeta">${escapeHtml(friend.city)} · ${escapeHtml(friend.zoneLabel)}</span>
          <div class="chips">
            <span class="chip">${friend.phase}</span>
            <span class="chip">${escapeHtml(friend.chat_window || text.noWindow)}</span>
            <span class="chip">${escapeHtml(friend.mood || text.noMood)}</span>
          </div>
          <span class="friendNote">${escapeHtml(friend.note || text.noNote)}</span>
          <small class="updatedAt">${text.updatedAt} ${escapeHtml(shortTime(friend.updated_at))}</small>
        </article>
      `;
    })
    .join("");
}

function renderMessages() {
  if (!messages.length) {
    el.messagesList.innerHTML = `<article class="empty">${text.noMessages}</article>`;
    return;
  }

  el.messagesList.innerHTML = messages
    .map((message) => {
      return `
        <article class="messageItem">
          <div class="messageTop">
            <strong>${escapeHtml(message.name || text.anonymous)}</strong>
            <div class="messageActions">
              <small>${escapeHtml(shortTime(message.created_at))}</small>
              <button type="button" class="replyButton" data-reply-to="${escapeHtml(message.name || text.anonymous)}">回复</button>
            </div>
          </div>
          <p>${escapeHtml(message.body)}</p>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderFriends();
  renderMessages();
}

async function loadFriends() {
  if (!client) return;
  const { data, error } = await client.from("friend_status").select("*").order("updated_at", { ascending: false }).limit(100);
  if (error) {
    setStatus(`读取朋友失败：${error.message}`, true);
    return;
  }
  rows = data || [];
  renderFriends();
  setStatus(text.readOk);
}

async function loadMessages() {
  if (!client) return;
  const { data, error } = await client.from("wall_messages").select("*").order("created_at", { ascending: false }).limit(80);
  if (error) {
    setStatus(`读取留言失败：${error.message}`, true);
    return;
  }
  messages = data || [];
  renderMessages();
}

function fillOwnProfile(row) {
  if (!row) return;
  el.name.value = row.name || "";
  el.city.value = row.city || "";
  el.zone.value = row.zone || "America/Toronto";
  el.mood.value = row.mood || "";
  el.window.value = row.chat_window || "";
  el.note.value = row.note || "";
  el.messageName.value = row.name || "";
}

async function loadOwnProfile() {
  if (!client || !currentId) return;
  const { data } = await client.from("friend_status").select("*").eq("id", currentId).maybeSingle();
  fillOwnProfile(data);
}

async function saveProfile(event) {
  event.preventDefault();
  if (!client) {
    setStatus(text.noClient, true);
    return;
  }

  const payload = {
    name: el.name.value.trim(),
    city: el.city.value.trim(),
    zone: el.zone.value,
    mood: el.mood.value.trim() || text.newFriend,
    chat_window: el.window.value.trim() || "19:00-22:00",
    note: el.note.value.trim(),
    updated_at: new Date().toISOString()
  };

  if (!payload.name || !payload.city) {
    setStatus(text.needNameCity, true);
    return;
  }

  let result;
  if (currentId) {
    result = await client.from("friend_status").update(payload).eq("id", currentId).select().maybeSingle();
  } else {
    result = await client.from("friend_status").insert(payload).select().single();
  }

  if (result.error || !result.data) {
    result = await client.from("friend_status").insert(payload).select().single();
  }

  if (result.error) {
    setStatus(`保存失败：${result.error.message}`, true);
    return;
  }

  currentId = result.data.id;
  localStorage.setItem(storageKey, currentId);
  el.messageName.value = result.data.name || "";
  setStatus(text.saveOk);
  await loadFriends();
}

async function sendMessage(event) {
  event.preventDefault();
  if (!client) {
    setStatus(text.noClient, true);
    return;
  }

  const body = el.message.value.trim();
  if (!body) return;

  const payload = {
    name: el.messageName.value.trim() || el.name.value.trim() || text.anonymous,
    body,
    created_at: new Date().toISOString()
  };

  const { error } = await client.from("wall_messages").insert(payload);
  if (error) {
    setStatus(`发送留言失败：${error.message}`, true);
    return;
  }

  el.message.value = "";
  setStatus(text.messageSent);
  await loadMessages();
}

function startReply(event) {
  const button = event.target.closest(".replyButton");
  if (!button) return;

  const name = button.dataset.replyTo || text.anonymous;
  const prefix = `@${name} `;
  if (!el.message.value.startsWith(prefix)) {
    el.message.value = `${prefix}${el.message.value}`.trimEnd();
  }
  el.message.focus();
}

function subscribeToChanges() {
  client
    .channel("mimimimi-friends")
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_status" }, loadFriends)
    .on("postgres_changes", { event: "*", schema: "public", table: "wall_messages" }, loadMessages)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus(text.realtimeOk);
    });
}

function boot() {
  el.form.addEventListener("submit", saveProfile);
  el.messageForm.addEventListener("submit", sendMessage);
  el.messagesList.addEventListener("click", startReply);
  el.refresh.addEventListener("click", () => {
    loadFriends();
    loadMessages();
  });
  setInterval(() => {
    render();
    loadFriends();
    loadMessages();
  }, 30000);

  if (!hasConfig) {
    setStatus(text.noConfig, true);
    render();
    return;
  }

  client = window.supabase.createClient(config.url, config.anonKey);
  loadOwnProfile();
  loadFriends();
  loadMessages();
  subscribeToChanges();
}

boot();
