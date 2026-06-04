const config = window.MIMIMIMI_SUPABASE || {};
const hasConfig = Boolean(config.url && config.anonKey && !config.anonKey.includes("PASTE_"));
const storageKey = "mimimimi-supabase-profile-id";

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
  liveBadge: document.querySelector("#liveBadge")
};

let client = null;
let currentId = localStorage.getItem(storageKey);
let rows = [];

function setStatus(text, isError = false) {
  el.status.textContent = text;
  el.liveBadge.textContent = isError ? "未连接" : "已同步";
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
  if (hour < 6) return "深夜";
  if (hour < 11) return "早晨";
  if (hour < 14) return "午间";
  if (hour < 18) return "下午";
  if (hour < 22) return "晚上";
  return "夜里";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  const decorated = rows.map((friend) => {
    const time = localDate(friend.zone || "America/Toronto");
    return { ...friend, time, phase: phaseFor(time.hour) };
  });

  el.friendCount.textContent = String(decorated.length);
  el.awakeCount.textContent = String(decorated.filter((friend) => friend.time.hour >= 8 && friend.time.hour <= 23).length);

  if (!decorated.length) {
    el.list.innerHTML = `<article class="empty">还没有朋友加入。</article>`;
    return;
  }

  el.list.innerHTML = decorated
    .map((friend) => {
      const updated = friend.updated_at ? new Date(friend.updated_at).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "";
      return `
        <article class="friendCard">
          <div class="friendTop">
            <span class="avatar">${escapeHtml(friend.name).slice(0, 1).toUpperCase() || "?"}</span>
            <span class="friendTime">${friend.time.label}</span>
          </div>
          <strong class="friendName">${escapeHtml(friend.name)}</strong>
          <span class="friendMeta">${escapeHtml(friend.city)} · ${escapeHtml(friend.zone)}</span>
          <div class="chips">
            <span class="chip">${friend.phase}</span>
            <span class="chip">${escapeHtml(friend.chat_window || "未设置聊天时间")}</span>
            <span class="chip">${escapeHtml(friend.mood || "今天还没发状态")}</span>
          </div>
          <span class="friendNote">${escapeHtml(friend.note || "没有小纸条。")}</span>
          <small class="updatedAt">更新于 ${escapeHtml(updated)}</small>
        </article>
      `;
    })
    .join("");
}

async function loadFriends() {
  if (!client) return;
  const { data, error } = await client.from("friend_status").select("*").order("updated_at", { ascending: false }).limit(100);
  if (error) {
    setStatus(`读取失败：${error.message}`, true);
    return;
  }
  rows = data || [];
  render();
  setStatus("已读取最新状态。");
}

function fillOwnProfile(row) {
  if (!row) return;
  el.name.value = row.name || "";
  el.city.value = row.city || "";
  el.zone.value = row.zone || "America/Toronto";
  el.mood.value = row.mood || "";
  el.window.value = row.chat_window || "";
  el.note.value = row.note || "";
}

async function loadOwnProfile() {
  if (!client || !currentId) return;
  const { data } = await client.from("friend_status").select("*").eq("id", currentId).maybeSingle();
  fillOwnProfile(data);
}

async function saveProfile(event) {
  event.preventDefault();
  if (!client) {
    setStatus("还没填 Supabase anon key。", true);
    return;
  }

  const payload = {
    name: el.name.value.trim(),
    city: el.city.value.trim(),
    zone: el.zone.value,
    mood: el.mood.value.trim() || "新朋友",
    chat_window: el.window.value.trim() || "19:00-22:00",
    note: el.note.value.trim(),
    updated_at: new Date().toISOString()
  };

  if (!payload.name || !payload.city) {
    setStatus("名字和城市都要填。", true);
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
  setStatus("保存好了，朋友们刷新后就能看到。");
  await loadFriends();
}

function subscribeToChanges() {
  client
    .channel("friend-status-wall")
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_status" }, () => {
      loadFriends();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setStatus("实时同步已连接。");
    });
}

function boot() {
  el.form.addEventListener("submit", saveProfile);
  el.refresh.addEventListener("click", loadFriends);
  setInterval(() => {
    render();
    loadFriends();
  }, 30000);

  if (!hasConfig) {
    setStatus("请先在 config.js 里填 Supabase anon public key。", true);
    render();
    return;
  }

  client = window.supabase.createClient(config.url, config.anonKey);
  loadOwnProfile();
  loadFriends();
  subscribeToChanges();
}

boot();
