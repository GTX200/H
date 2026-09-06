// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  OWNER_NAME: "Ghzxyaas",
  WHATSAPP: "6288228736440",
  MUSIC_URL: "/assets/lagu.mp3",
  MUSIC_VOLUME: 0.80,
  RAPIDAPI_KEY_ENV: "RAPIDAPI_KEY",
  
  REQUEST_TIMEOUT: 30000,
  CACHE_TTL: 3600,
  MAX_REQUESTS_PER_MINUTE: 60,
  
  YOUTUBE_API_HOST: "youtube-media-downloader.p.rapidapi.com",
  YOUTUBE_DETAILS_PATH: "/v2/video/details",
  YOUTUBE_AUDIO_API_HOST: "youtube-mp3-audio-video-downloader.p.rapidapi.com",
  YOUTUBE_AUDIO_MP3_PATH: "/download-mp3",
  YOUTUBE_AUDIO_M4A_PATH: "/download-m4a",
  
  TIKTOK_API_HOST: "all-in-one-social-media-downloader1.p.rapidapi.com",
  TIKTOK_API_PATH: "/media",
  TIKTOK_VIDEO_API_HOST: "tiktok-download-video-no-watermark.p.rapidapi.com",
  TIKTOK_VIDEO_API_PATH: "/tiktok/info",
  TIKTOK_USER_API_HOST: "tiktok-video-downloader-api.p.rapidapi.com",
  TIKTOK_USER_API_PATH: "/user",
  
  FACEBOOK_API_HOST: "facebook-reel-and-video-downloader.p.rapidapi.com",
  FACEBOOK_API_PATH: "/app/main.php",
  
  INSTAGRAM_API_HOST: "instagram-reels-downloader-api.p.rapidapi.com",
  INSTAGRAM_API_PATH: "/download"
};

// ============================================================
// CORS HEADERS
// ============================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Range, Accept-Ranges"
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...corsHeaders
      }
    }
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function safeFilename(value, format = "mp4") {
  const base = String(value || "GHZ-Media")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "GHZ-Media";

  const extMap = {
    mp3: "mp3",
    mp4: "mp4",
    jpg: "jpg",
    webm: "webm",
    m4a: "m4a"
  };
  
  const ext = extMap[format] || "mp4";
  return base.endsWith("." + ext) ? base : base + "." + ext;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeout = CONFIG.REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout after ' + timeout + 'ms');
    }
    throw error;
  }
}

// ============================================================
// SIMPLE CACHE
// ============================================================
class SimpleCache {
  constructor(ttl = CONFIG.CACHE_TTL) {
    this.cache = new Map();
    this.ttl = ttl * 1000;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// ============================================================
// RATE LIMITER
// ============================================================
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.maxRequests = CONFIG.MAX_REQUESTS_PER_MINUTE;
    this.window = 60000;
  }

  isAllowed(ip) {
    const now = Date.now();
    const windowStart = now - this.window;
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    const timestamps = this.requests.get(ip);
    const recent = timestamps.filter(t => t > windowStart);
    
    if (recent.length >= this.maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(ip, recent);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// ============================================================
// WEBSITE HTML
// ============================================================
function html() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#080d1c">
  <meta name="description" content="GHZ Multi Downloader - YouTube, TikTok, Facebook dan Instagram">
  <title>GHZ Multi Downloader</title>
  <style>
    * { box-sizing:border-box; }
    body { 
      margin:0; min-height:100vh; font-family:Arial,system-ui,sans-serif; color:white;
      background: radial-gradient(circle at top, #24315e, #0a0f20 45%, #05070d);
    }
    .wrap { width:min(900px,92%); margin:auto; padding:30px 0; }
    .hero { text-align:center; padding:25px 0; }
    .logo {
      width:75px; height:75px; margin:auto; display:grid; place-items:center;
      border-radius:23px; font-size:35px; font-weight:900;
      background: linear-gradient(135deg, #6c5ce7, #00c6ff);
      box-shadow: 0 15px 50px #00c6ff30;
    }
    h1 { font-size:clamp(32px,8vw,55px); margin:15px 0 5px; }
    .sub { color:#aeb9d5; }
    .card {
      background:#10172bee; border:1px solid #293555; border-radius:24px;
      padding:22px; box-shadow: 0 25px 80px #0008;
    }
    .row { display:flex; gap:10px; flex-wrap:wrap; }
    input {
      flex:1; min-width:200px; padding:16px; border-radius:14px;
      border:1px solid #35415e; background:#080e1c; color:white;
      outline:none; font-size:16px;
      transition: border-color 0.3s ease;
    }
    input:focus { border-color:#6c5ce7; }
    input:disabled { opacity:0.5; }
    button {
      padding:15px 19px; border:0; border-radius:14px; color:white;
      font-weight:800; cursor:pointer; transition: transform 0.2s ease, opacity 0.2s ease;
      background: linear-gradient(135deg, #6c5ce7, #00aeea);
    }
    button:hover:not(:disabled) { transform: scale(1.02); }
    button:disabled { opacity:.6; cursor:not-allowed; transform: none; }
    .platforms, .formats { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
    .platforms button, .formats button {
      background:#18223a; border:1px solid #33415f;
      transition: all 0.3s ease;
    }
    .platforms button.active, .formats button.active {
      background: linear-gradient(135deg, #6c5ce7, #00aeea);
      border-color: #6c5ce7;
      box-shadow: 0 0 20px #6c5ce744;
    }
    #status {
      display:none; margin-top:15px; padding:14px; border-radius:13px;
      background:#0a1223; border:1px solid #263653; color:#bac8e4;
      word-break:break-word;
    }
    #status.error { border-color:#ff4444; color:#ff6666; }
    #status.success { border-color:#44ff88; color:#66ffaa; }
    #status.loading { 
      border-color:#6c5ce7; color:#aeb9d5;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    #result { margin-top:18px; display:none; }
    #thumb {
      max-width:180px; max-height:220px; object-fit:cover;
      border-radius:12px; margin:0 auto 15px; display:block;
      box-shadow: 0 8px 30px #0006;
    }
    #title { text-align:center; line-height:1.5; font-size:18px; font-weight:600; }
    #title .small { font-weight:400; font-size:13px; color:#8390aa; display:block; margin-top:5px; }
    #progress-bar {
      width:100%; height:4px; background:#1a2340; border-radius:4px;
      margin:15px 0; overflow:hidden; display:none;
    }
    #progress-bar .fill {
      height:100%; width:0%; background: linear-gradient(90deg, #6c5ce7, #00aeea);
      transition: width 0.3s ease; border-radius:4px;
    }
    .info {
      display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:12px; margin-top:18px;
    }
    .info div { padding:16px; border-radius:16px; background:#0a1221; border:1px solid #202d49; }
    .owner { margin-top:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .wa { background:#20c875; }
    .small { font-size:12px; color:#8390aa; line-height:1.5; }
    footer { text-align:center; color:#66728d; font-size:12px; margin-top:25px; }
    .badge {
      display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px;
      font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
    }
    .badge.success { background:#20c87533; color:#20c875; }
    .badge.error { background:#ff444433; color:#ff4444; }
    
    @media(max-width:600px) {
      .row button { width:100%; }
      .owner button { width:100%; }
      .platforms button, .formats button { flex:1; }
    }
  </style>
</head>
<body>
<div class="wrap">
  <section class="hero">
    <div class="logo">⬇️</div>
    <h1>GHZ Multi Downloader</h1>
    <div class="sub">YouTube • TikTok • Facebook • Instagram</div>
  </section>
  
  <section class="card">
    <div class="row">
      <input id="url" type="url" placeholder="Tempel URL video / foto..." autocomplete="off">
      <button id="process">⚡ PROSES</button>
    </div>
    
    <div class="platforms">
      <button class="active" data-platform="auto">🌐 AUTO</button>
      <button data-platform="youtube">▶️ YouTube</button>
      <button data-platform="tiktok">🎵 TikTok</button>
      <button data-platform="facebook">📘 Facebook</button>
      <button data-platform="instagram">📸 Instagram</button>
    </div>
    
    <div class="formats">
      <button class="active" data-format="mp4">🎬 MP4</button>
      <button data-format="mp3">🎵 AUDIO</button>
      <button data-format="jpg">🖼️ JPG</button>
    </div>
    
    <div id="qualityBox" style="margin-top:14px">
      <label for="quality" class="small" style="display:block;margin-bottom:7px">Kualitas video</label>
      <select id="quality" style="width:100%;padding:14px;border-radius:14px;border:1px solid #35415e;background:#080e1c;color:white;outline:none;font-size:16px">
        <option value="best">⭐ Terbaik / otomatis</option>
        <option value="2160">2160p (4K)</option>
        <option value="1440">1440p (2K)</option>
        <option value="1080">1080p (Full HD)</option>
        <option value="720">720p (HD)</option>
        <option value="480">480p</option>
        <option value="360">360p</option>
      </select>
      <div class="small" style="margin-top:6px">Jika kualitas persis tidak tersedia, API memilih kualitas terdekat.</div>
    </div>
    
    <div id="status"></div>
    
    <div id="progress-bar"><div class="fill" id="progress-fill"></div></div>
    
    <div id="result">
      <img id="thumb" alt="Thumbnail">
      <div id="title"></div>
      <button id="download" style="width:100%;margin-top:12px">⬇️ DOWNLOAD FILE</button>
    </div>
    
    <div class="info">
      <div>
        <strong>🌐 Multi Platform</strong>
        <p class="small">URL dapat dideteksi otomatis.</p>
      </div>
      <div>
        <strong>🔐 API Aman</strong>
        <p class="small">API key disimpan sebagai Cloudflare Secret.</p>
      </div>
      <div>
        <strong>📱 Responsive</strong>
        <p class="small">Cocok untuk Android dan desktop.</p>
      </div>
    </div>
    
    <div class="owner">
      <div>
        <strong>${escapeHtml(CONFIG.OWNER_NAME)}</strong>
        <div class="small">Admin / Owner</div>
      </div>
      <button class="wa" onclick="openWA()">💬 WhatsApp Admin</button>
    </div>
    
    <p class="small">Gunakan hanya untuk konten yang Anda miliki atau memang diizinkan untuk diunduh.</p>
  </section>
  
  <footer>© ${new Date().getFullYear()} GHZ Multi Downloader</footer>
</div>

<audio id="music" loop preload="auto" playsinline></audio>

<script>
let selectedFormat = "mp4";
let selectedPlatform = "auto";
let lastUrl = "";
let selectedQuality = "best";
let isProcessing = false;

document.querySelectorAll("[data-platform]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("[data-platform]").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    selectedPlatform = btn.dataset.platform;
  };
});

document.querySelectorAll("[data-format]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("[data-format]").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    selectedFormat = btn.dataset.format;
    updateQualityVisibility();
  };
});

const qualityBox = document.getElementById("qualityBox");
const qualitySelect = document.getElementById("quality");

function updateQualityVisibility() {
  qualityBox.style.display = selectedFormat === "mp4" ? "block" : "none";
}

qualitySelect.onchange = () => {
  selectedQuality = qualitySelect.value || "best";
};
updateQualityVisibility();

function showStatus(text, type = "info") {
  const box = document.getElementById("status");
  box.style.display = "block";
  box.textContent = text;
  box.className = type;
}

function hideStatus() {
  const box = document.getElementById("status");
  box.style.display = "none";
  box.className = "";
}

function updateProgress(percent) {
  const bar = document.getElementById("progress-bar");
  const fill = document.getElementById("progress-fill");
  if (percent > 0 && percent < 100) {
    bar.style.display = "block";
    fill.style.width = Math.min(100, percent) + "%";
  } else {
    bar.style.display = "none";
    fill.style.width = "0%";
  }
}

function openWA() {
  const number = ${JSON.stringify(CONFIG.WHATSAPP)};
  window.open("https://wa.me/" + number, "_blank", "noopener,noreferrer");
}

const music = document.getElementById("music");
const MUSIC_URL = ${JSON.stringify(CONFIG.MUSIC_URL)};
const MUSIC_VOLUME = Number(${JSON.stringify(CONFIG.MUSIC_VOLUME)});
let musicReady = false;

function prepareMusic() {
  if (!MUSIC_URL || !music) return false;
  if (!musicReady) {
    music.src = MUSIC_URL;
    music.volume = Math.max(0, Math.min(1, MUSIC_VOLUME));
    music.preload = "auto";
    musicReady = true;
    music.load();
  }
  return true;
}

async function playMusicFromGesture() {
  if (!prepareMusic()) return false;
  try {
    await music.play();
    return true;
  } catch (error) {
    console.warn("Musik belum dapat diputar:", error);
    return false;
  }
}

document.getElementById("process").onclick = async () => {
  if (isProcessing) return;
  
  if (music && music.paused) {
    void playMusicFromGesture();
  }
  
  const input = document.getElementById("url");
  const button = document.getElementById("process");
  const result = document.getElementById("result");
  const url = input.value.trim();
  
  if (!url) {
    showStatus("❌ Masukkan URL terlebih dahulu.", "error");
    return;
  }
  
  try {
    new URL(url);
  } catch {
    showStatus("❌ URL tidak valid.", "error");
    return;
  }
  
  isProcessing = true;
  button.disabled = true;
  button.textContent = "⏳ MEMPROSES...";
  result.style.display = "none";
  hideStatus();
  updateProgress(10);
  
  try {
    showStatus("⏳ Menghubungi API...", "loading");
    updateProgress(30);
    
    const response = await fetch(
      "/api/download?url=" + encodeURIComponent(url) +
      "&format=" + encodeURIComponent(selectedFormat) +
      "&platform=" + encodeURIComponent(selectedPlatform) +
      "&quality=" + encodeURIComponent(selectedQuality),
      { method: "GET", cache: "no-store" }
    );
    
    updateProgress(70);
    
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data.error || "API gagal memproses permintaan.");
    }
    
    if (!data.url) {
      throw new Error("API tidak mengembalikan URL file.");
    }
    
    updateProgress(90);
    
    lastUrl = data.url.startsWith("/api/file?")
      ? data.url + "&title=" + encodeURIComponent(data.title || "GHZ-Media")
      : "/api/file?url=" + encodeURIComponent(data.url) +
        "&format=" + encodeURIComponent(data.format || selectedFormat) +
        "&title=" + encodeURIComponent(data.title || "GHZ-Media");
    
    const titleEl = document.getElementById("title");
    titleEl.innerHTML = data.title || "Media siap";
    
    const meta = document.createElement("span");
    meta.className = "small";
    meta.textContent = "Platform: " + (data.platform || selectedPlatform) +
                       " • Format: " + (data.format || selectedFormat);
    titleEl.appendChild(meta);
    
    const thumbnail = document.getElementById("thumb");
    thumbnail.style.display = "none";
    if (data.thumbnail && isHttpUrl(data.thumbnail)) {
      thumbnail.src = data.thumbnail;
      thumbnail.onload = () => { thumbnail.style.display = "block"; };
      thumbnail.onerror = () => { thumbnail.style.display = "none"; };
    }
    
    result.style.display = "block";
    
    document.getElementById("download").onclick = () => {
      if (!lastUrl) return;
      window.location.href = lastUrl;
    };
    
    updateProgress(100);
    showStatus("✅ Media siap. Klik DOWNLOAD FILE.", "success");
    
  } catch (error) {
    console.error(error);
    showStatus("❌ " + (error.message || "Terjadi kesalahan."), "error");
    updateProgress(0);
  } finally {
    isProcessing = false;
    button.disabled = false;
    button.textContent = "⚡ PROSES";
    setTimeout(() => updateProgress(0), 2000);
  }
};

document.getElementById("url").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("process").click();
});

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}
</script>
</body>
</html>`;
}

// ============================================================
// PLATFORM DETECTION
// ============================================================
function detectPlatform(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    
    if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
      return "youtube";
    }
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      return "tiktok";
    }
    if (host === "facebook.com" || host === "fb.watch" || host.endsWith(".facebook.com")) {
      return "facebook";
    }
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      return "instagram";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

function youtubeVideoId(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    
    if (host === "youtu.be") {
      return u.pathname.split("/").filter(Boolean)[0] || null;
    }
    
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v") || null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0])) {
        return parts[1] || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function tiktokUsernameFromUrl(sourceUrl) {
  try {
    const u = new URL(sourceUrl);
    if (!/^(www\.)?tiktok\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const at = parts.find(p => p.startsWith("@"));
    if (!at) return null;
    const username = at.slice(1).trim();
    if (!/^[A-Za-z0-9._-]{1,50}$/.test(username)) return null;
    return username;
  } catch {
    return null;
  }
}

// ============================================================
// RAPIDAPI REQUEST
// ============================================================
async function rapidGet(url, env, host, retries = 2) {
  const key = env[CONFIG.RAPIDAPI_KEY_ENV];
  if (!key) {
    throw new Error("RAPIDAPI_KEY belum tersedia di Cloudflare Secrets.");
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            "x-rapidapi-host": host,
            "x-rapidapi-key": key,
            "Accept": "application/json"
          }
        },
        CONFIG.REQUEST_TIMEOUT
      );
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  throw lastError || new Error("Failed to fetch from RapidAPI after " + retries + " retries");
}

// ============================================================
// MEDIA URL FINDER
// ============================================================
function findMediaUrl(data, format, requestedQuality = "best", platform = "") {
  const wanted = format === "mp3" ? "audio" : format === "jpg" ? "image" : "video";
  const candidates = [];
  
  function extensionOf(url) {
    try {
      const m = new URL(url).pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
      return m ? m[1] : "";
    } catch { return ""; }
  }

  function add(url, meta = {}) {
    if (!isHttpUrl(url)) return;
    candidates.push({
      url,
      key: String(meta.key || "").toLowerCase(),
      type: String(meta.type || "").toLowerCase(),
      ext: String(meta.ext || extensionOf(url)).toLowerCase(),
      width: Number(meta.width || 0),
      height: Number(meta.height || 0),
      bitrate: Number(meta.bitrate || meta.audioBitrate || 0),
      quality: String(meta.quality || meta.resolution || ""),
      hasAudio: meta.hasAudio === true || meta.hasAudio === "true"
    });
  }

  function addObject(obj, key = "") {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const meta = {
      type: obj.type || obj.mimeType || obj.mediaType || obj.kind || "",
      ext: obj.ext || obj.extension || obj.fileExtension || "",
      width: obj.width || obj.w || 0,
      height: obj.height || obj.h || 0,
      bitrate: obj.bitrate || obj.audioBitrate || obj.averageBitrate || 0,
      quality: obj.quality || obj.resolution || obj.videoQuality || "",
      hasAudio: obj.hasAudio === true || obj.hasAudio === "true" || obj.audio === true
    };
    for (const field of ["url", "downloadUrl", "download_url", "src", "link", "videoUrl", "video_url", "audioUrl", "audio_url", "file", "fileUrl", "file_url", "download", "downloadLink", "download_link"]) {
      if (isHttpUrl(obj[field])) add(obj[field], { ...meta, key: key + " " + field });
    }
  }

  if (format === "mp4" && data?.videos) {
    const items = Array.isArray(data.videos) ? data.videos : Array.isArray(data.videos.items) ? data.videos.items : [];
    for (const item of items) addObject(item, "videos");
  }
  if (format === "mp3" && data?.audios) {
    const items = Array.isArray(data.audios) ? data.audios : Array.isArray(data.audios.items) ? data.audios.items : [];
    for (const item of items) addObject(item, "audios");
  }

  if (Array.isArray(data?.media)) {
    for (const item of data.media) {
      if (!item || typeof item !== "object") continue;
      const type = String(item.type || "").toLowerCase();
      if ((wanted === "video" && type === "video") ||
          (wanted === "audio" && type === "audio") ||
          (wanted === "image" && (type === "image" || type === "photo"))) {
        addObject(item, "media " + type);
      }
    }
  }

  if (format === "jpg") {
    const images = [];
    function collectImage(value, key = "", depth = 0) {
      if (depth > 10 || value == null) return;
      if (typeof value === "string") {
        if (isHttpUrl(value)) images.push({ url: value, key: key.toLowerCase(), width: 0, height: 0 });
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) collectImage(item, key, depth + 1);
        return;
      }
      if (typeof value !== "object") return;
      const width = Number(value.width || value.w || 0);
      const height = Number(value.height || value.h || 0);
      for (const field of ["url", "src", "image", "thumbnail", "downloadUrl"]) {
        if (isHttpUrl(value[field])) images.push({ url: value[field], key: (key + " " + field).toLowerCase(), width, height });
      }
      for (const [k, v] of Object.entries(value)) {
        if (!["url", "src", "image", "thumbnail", "downloadUrl"].includes(k)) collectImage(v, key + " " + k, depth + 1);
      }
    }
    collectImage(data);
    images.sort((a, b) => {
      const score = item => {
        const marker = (item.key + " " + item.url).toLowerCase();
        let s = 0;
        if (/thumbnail|image|photo|picture|cover/.test(item.key)) s += 400;
        if (/favicon|icon|avatar|profile|logo|48x48|32x32|24x24|16x16/.test(marker)) s -= 2000;
        s += Math.min(item.width * item.height, 6000000) / 5000;
        if (/\.(jpg|jpeg|png|webp)(?:$|[?#])/.test(item.url.toLowerCase())) s += 100;
        return s;
      };
      return score(b) - score(a);
    });
    const realImage = images.find(item => !/favicon|icon|avatar|profile|logo|48x48|32x32|24x24|16x16/.test((item.key + " " + item.url).toLowerCase()));
    if (realImage) return realImage.url;
  }

  function walk(value, key = "", depth = 0) {
    if (depth > 10 || value == null) return;
    if (typeof value === "string") {
      if (isHttpUrl(value)) add(value, { key });
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, key, depth + 1);
      return;
    }
    if (typeof value !== "object") return;
    addObject(value, key);
    for (const [k, v] of Object.entries(value)) walk(v, k, depth + 1);
  }
  walk(data);

  function score(item) {
    const marker = (item.key + " " + item.url).toLowerCase();
    let points = 0;
    if (format === "mp4") {
      if (item.type === "video") points += 700;
      if (item.hasAudio) points += 450;
      if (/videos|video|download|stream|play/.test(item.key)) points += 300;
      if (/\.mp4(?:$|[?#])/.test(item.url.toLowerCase())) points += 250;
      if (/videoplayback|googlevideo|tiktokcdn|fbcdn|cdninstagram/.test(marker)) points += 150;
      if (/image|thumbnail|photo|avatar|favicon|icon|logo/.test(marker)) points -= 2000;
    }
    if (format === "mp3") {
      if (item.type === "audio") points += 700;
      if (/audios|audio|music|mp3|m4a|opus|aac/.test(item.key)) points += 300;
      if (/\.(mp3|m4a|aac|opus)(?:$|[?#])/.test(item.url.toLowerCase())) points += 250;
      if (/image|thumbnail|photo|avatar|favicon|icon|logo|video/.test(marker)) points -= 2000;
    }
    if (format === "mp4" && requestedQuality !== "best") {
      const target = Number(requestedQuality);
      const h = item.height || Number(String(item.quality).match(/(\d{3,4})/)?.[1] || 0);
      if (h) {
        if (h === target) points += 1200;
        else if (h < target) points += Math.max(0, 900 - (target - h) * 2);
        else points += Math.max(0, 500 - (h - target) * 2);
      }
    }
    if (format === "jpg") {
      if (item.type === "image") points += 700;
      if (/image|photo|jpg|jpeg|picture|thumbnail|cover/.test(item.key)) points += 300;
      if (/\.(jpg|jpeg|png|webp)(?:$|[?#])/.test(item.url.toLowerCase())) points += 200;
    }
    return points;
  }

  candidates.sort((a, b) => {
    const byScore = score(b) - score(a);
    if (byScore) return byScore;
    if (format === "mp4" && b.hasAudio !== a.hasAudio) return b.hasAudio ? 1 : -1;
    return ((b.width * b.height) - (a.width * a.height));
  });

  if (format === "mp4" && candidates.length && platform === "youtube") {
    const combined = candidates.filter(item => item.hasAudio === true);
    if (combined.length) {
      combined.sort((a,b) => {
        const sa = score(a) + Math.min(a.width * a.height, 12000000) / 10000;
        const sb = score(b) + Math.min(b.width * b.height, 12000000) / 10000;
        return sb - sa;
      });
      return combined[0].url;
    }
    return null;
  }

  const best = candidates.find(item => {
    const marker = (item.key + " " + item.url).toLowerCase();
    if (/favicon|avatar|profile|logo|icon|48x48|32x32|24x24|16x16/.test(marker)) return false;
    if (format === "mp3" && /image|thumbnail|photo|video/.test(marker)) return false;
    return score(item) > 0;
  });
  return best?.url || null;
}

// ============================================================
// PLATFORM REQUEST FUNCTIONS
// ============================================================
async function youtubeAudioRequest(sourceUrl, env) {
  const videoId = youtubeVideoId(sourceUrl);
  if (!videoId) throw new Error("Video ID YouTube tidak ditemukan.");

  const u = new URL("https://" + CONFIG.YOUTUBE_AUDIO_API_HOST + CONFIG.YOUTUBE_AUDIO_MP3_PATH + "/" + encodeURIComponent(videoId));
  u.searchParams.set("quality", "high");

  const response = await rapidGet(u.toString(), env, CONFIG.YOUTUBE_AUDIO_API_HOST);

  if (!response.ok) {
    let message = "YouTube Audio API gagal (HTTP " + response.status + ").";
    try {
      const body = await response.clone().text();
      if (body) {
        try {
          const data = JSON.parse(body);
          message = data.message || data.error || message;
        } catch {}
      }
    } catch {}
    throw new Error(message);
  }

  const type = (response.headers.get("Content-Type") || "").toLowerCase();
  if (!type || (!type.includes("audio/") && !type.includes("application/octet-stream"))) {
    let detail = "Provider tidak mengembalikan stream audio.";
    try {
      const body = await response.clone().text();
      if (body) detail += " Respons: " + body.slice(0, 300);
    } catch {}
    throw new Error(detail);
  }

  return {
    success: true,
    platform: "youtube",
    format: "mp3",
    url: u.toString(),
    title: "YouTube Audio",
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    direct_provider: true,
    content_type: type
  };
}

async function youtubeRequest(sourceUrl, format, env, quality = "best") {
  const videoId = youtubeVideoId(sourceUrl);
  if (!videoId) throw new Error("Video ID YouTube tidak ditemukan.");

  if (format === "mp3") {
    return await youtubeAudioRequest(sourceUrl, env);
  }

  const cacheKey = `youtube:${videoId}:${format}:${quality}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const u = new URL("https://" + CONFIG.YOUTUBE_API_HOST + CONFIG.YOUTUBE_DETAILS_PATH);
  u.searchParams.set("videoId", videoId);
  u.searchParams.set("urlAccess", "normal");
  u.searchParams.set("videos", "auto");
  u.searchParams.set("audios", "auto");

  const response = await rapidGet(u.toString(), env, CONFIG.YOUTUBE_API_HOST);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "YouTube API gagal.");
  }

  const mediaUrl = format === "jpg"
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : findMediaUrl(data, format, quality, "youtube");

  if (!mediaUrl) {
    throw new Error(format === "mp4"
      ? "API YouTube hanya mengembalikan stream video tanpa audio."
      : "URL media YouTube tidak ditemukan.");
  }

  const result = {
    success: true,
    platform: "youtube",
    format,
    url: mediaUrl,
    title: data.title || data.videoDetails?.title || "YouTube Media",
    thumbnail: data.thumbnail?.url || data.thumbnail || null
  };

  cache.set(cacheKey, result);
  return result;
}

async function facebookRequest(sourceUrl, format, env) {
  const cacheKey = `facebook:${sourceUrl}:${format}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const u = new URL("https://" + CONFIG.FACEBOOK_API_HOST + CONFIG.FACEBOOK_API_PATH);
  u.searchParams.set("url", sourceUrl);

  const response = await rapidGet(u.toString(), env, CONFIG.FACEBOOK_API_HOST);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Facebook API gagal.");
  }

  const mediaUrl = findMediaUrl(data, format);
  if (!mediaUrl) {
    throw new Error("URL media Facebook tidak ditemukan.");
  }

  const result = {
    success: true,
    platform: "facebook",
    format,
    url: mediaUrl,
    title: data.title || data.name || data.result?.title || "Facebook Media",
    thumbnail: data.thumbnail || data.thumbnailUrl || data.image || null
  };

  cache.set(cacheKey, result);
  return result;
}

async function tiktokUserRequest(sourceUrl, format, env) {
  const username = tiktokUsernameFromUrl(sourceUrl);
  if (!username) return null;

  const host = CONFIG.TIKTOK_USER_API_HOST;
  const u = new URL("https://" + host + CONFIG.TIKTOK_USER_API_PATH + "/" + encodeURIComponent(username));
  const response = await rapidGet(u.toString(), env, host);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "TikTok User API HTTP " + response.status);
  }

  const mediaUrl = findMediaUrl(data, format, "best", "tiktok-user");
  if (!mediaUrl) {
    throw new Error("TikTok User API tidak mengembalikan URL media.");
  }

  return {
    success: true,
    platform: "tiktok",
    format,
    url: mediaUrl,
    title: data?.user?.nickname || data?.userInfo?.user?.nickname || data?.nickname || "TikTok @" + username,
    thumbnail: data?.user?.avatar || data?.user?.avatarUrl || data?.user?.avatar_url || data?.userInfo?.user?.avatarLarger || data?.avatar || null,
    source: "tiktok-user-api",
    username
  };
}

async function socialRequest(sourceUrl, platform, format, env) {
  if (platform === "tiktok" && !/\/video\//i.test(sourceUrl)) {
    const usernameResult = await tiktokUserRequest(sourceUrl, format, env);
    if (usernameResult) return usernameResult;
  }

  const host = platform === "tiktok" ? CONFIG.TIKTOK_VIDEO_API_HOST : CONFIG.INSTAGRAM_API_HOST;
  const path = platform === "tiktok" ? CONFIG.TIKTOK_VIDEO_API_PATH : CONFIG.INSTAGRAM_API_PATH;

  const u = new URL("https://" + host + path);
  u.searchParams.set("url", sourceUrl);

  const response = await rapidGet(u.toString(), env, host);
  const contentType = (response.headers.get("Content-Type") || "").toLowerCase();

  if (platform === "tiktok" && contentType.includes("video/")) {
    return {
      success: true,
      platform: "tiktok",
      format: "mp4",
      url: "/api/file?provider=tiktok-video&sourceUrl=" + encodeURIComponent(sourceUrl) + "&format=mp4",
      title: "TikTok Max Quality",
      thumbnail: null,
      direct_provider: true
    };
  }

  if (platform === "instagram" && (contentType.includes("video/") || contentType.includes("image/") || contentType.includes("application/octet-stream"))) {
    const directFormat = contentType.includes("image/") ? "jpg" : "mp4";
    if (format !== directFormat) {
      throw new Error("Instagram mengembalikan " + directFormat.toUpperCase() + ". Pilih format " + directFormat.toUpperCase() + ".");
    }
    return {
      success: true,
      platform: "instagram",
      format: directFormat,
      url: "/api/file?provider=instagram-new&sourceUrl=" + encodeURIComponent(sourceUrl) + "&format=" + directFormat,
      title: "Instagram Media",
      thumbnail: null,
      direct_provider: true
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || platform.toUpperCase() + " API gagal.");
  }

  let mediaUrl = findMediaUrl(data, format, "best", platform);

  if (!mediaUrl && platform === "tiktok" && format === "mp4") {
    const candidates = [
      data?.video?.noWatermark, data?.video?.no_watermark,
      data?.video?.downloadAddr, data?.video?.download_addr,
      data?.video?.playAddr, data?.video?.play_addr,
      data?.data?.video?.noWatermark, data?.data?.video?.no_watermark,
      data?.data?.video?.downloadAddr, data?.data?.video?.download_addr,
      data?.data?.video?.playAddr, data?.data?.video?.play_addr,
      data?.data?.noWatermark, data?.data?.no_watermark,
      data?.noWatermark, data?.no_watermark,
      data?.downloadUrl, data?.download_url
    ];
    mediaUrl = candidates.find(v => typeof v === "string" && isHttpUrl(v)) || null;
  }

  if (!mediaUrl) {
    throw new Error("URL media " + platform.toUpperCase() + " tidak ditemukan.");
  }

  return {
    success: true,
    platform,
    format,
    url: mediaUrl,
    title: data.title || data.name || data.caption || data.result?.title || platform.toUpperCase() + " Media",
    thumbnail: data.thumbnail || data.thumbnailUrl || data.image || data.result?.thumbnail || null
  };
}

// ============================================================
// RAW PROVIDER REQUEST
// ============================================================
async function rawProviderRequest(sourceUrl, platform, env, format = "mp4", quality = "best") {
  let host;
  let apiUrl;

  if (platform === "youtube") {
    const videoId = youtubeVideoId(sourceUrl);
    if (!videoId) throw new Error("Video ID YouTube tidak ditemukan.");

    if (format === "mp3") {
      host = CONFIG.YOUTUBE_AUDIO_API_HOST;
      const u = new URL("https://" + host + CONFIG.YOUTUBE_AUDIO_MP3_PATH + "/" + encodeURIComponent(videoId));
      u.searchParams.set("quality", "high");
      apiUrl = u.toString();
      return rapidGet(apiUrl, env, host);
    }

    host = CONFIG.YOUTUBE_API_HOST;
    const u = new URL("https://" + host + CONFIG.YOUTUBE_DETAILS_PATH);
    u.searchParams.set("videoId", videoId);
    u.searchParams.set("urlAccess", "normal");
    u.searchParams.set("videos", "auto");
    u.searchParams.set("audios", "auto");
    if (quality && quality !== "best") u.searchParams.set("quality", quality);
    apiUrl = u.toString();
  } else if (platform === "facebook") {
    host = CONFIG.FACEBOOK_API_HOST;
    const u = new URL("https://" + host + CONFIG.FACEBOOK_API_PATH);
    u.searchParams.set("url", sourceUrl);
    apiUrl = u.toString();
  } else if (platform === "tiktok" || platform === "instagram") {
    if (platform === "tiktok" && !/\/video\//i.test(sourceUrl)) {
      const username = tiktokUsernameFromUrl(sourceUrl);
      if (username) {
        host = CONFIG.TIKTOK_USER_API_HOST;
        const u = new URL("https://" + host + CONFIG.TIKTOK_USER_API_PATH + "/" + encodeURIComponent(username));
        apiUrl = u.toString();
      }
    }
    if (!apiUrl) {
      host = platform === "tiktok" ? CONFIG.TIKTOK_VIDEO_API_HOST : CONFIG.INSTAGRAM_API_HOST;
      const path = platform === "tiktok" ? CONFIG.TIKTOK_VIDEO_API_PATH : CONFIG.INSTAGRAM_API_PATH;
      const u = new URL("https://" + host + path);
      u.searchParams.set("url", sourceUrl);
      apiUrl = u.toString();
    }
  } else {
    throw new Error("Platform tidak didukung.");
  }

  return rapidGet(apiUrl, env, host);
}

// ============================================================
// CLOUDFLARE WORKER
// ============================================================
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const requestUrl = new URL(request.url);
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

    if (!rateLimiter.isAllowed(clientIp)) {
      return json({
        success: false,
        error: "Terlalu banyak permintaan. Tunggu 1 menit."
      }, 429);
    }

    if (requestUrl.pathname.startsWith("/assets/") && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      return new Response(html(), {
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    if (requestUrl.pathname === "/api/health") {
      const key = env[CONFIG.RAPIDAPI_KEY_ENV];
      return json({
        success: true,
        rapidapi_key: Boolean(key),
        worker: "GHZ Multi Downloader",
        version: "2.0.0"
      });
    }

    if (requestUrl.pathname === "/api/file") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ success: false, error: "Method tidak didukung." }, 405);
      }

      const specialProvider = requestUrl.searchParams.get("provider");

      if (specialProvider === "tiktok-video") {
        const sourceUrl = requestUrl.searchParams.get("sourceUrl");
        const format = requestUrl.searchParams.get("format") || "mp4";
        const title = requestUrl.searchParams.get("title") || "TikTok-Video";

        if (!sourceUrl || !isHttpUrl(sourceUrl) || format !== "mp4") {
          return json({ success: false, error: "Parameter tidak valid." }, 400);
        }

        try {
          const u = new URL("https://" + CONFIG.TIKTOK_VIDEO_API_HOST + CONFIG.TIKTOK_VIDEO_API_PATH);
          u.searchParams.set("url", sourceUrl);

          const mediaResponse = await rapidGet(u.toString(), env, CONFIG.TIKTOK_VIDEO_API_HOST);

          if (!mediaResponse.ok) {
            return json({ success: false, error: "TikTok API HTTP " + mediaResponse.status }, 502);
          }

          const type = (mediaResponse.headers.get("Content-Type") || "").toLowerCase();
          if (type.includes("video/") || type.includes("application/octet-stream")) {
            const headers = new Headers(mediaResponse.headers);
            headers.set("Content-Disposition", 'attachment; filename="' + safeFilename(title, "mp4") + '"');
            headers.set("Content-Type", type.includes("video/") ? type : "video/mp4");
            headers.set("Cache-Control", "no-store");
            headers.set("Access-Control-Allow-Origin", "*");
            return new Response(mediaResponse.body, { status: mediaResponse.status, headers });
          }

          const data = await mediaResponse.json().catch(() => ({}));
          let mediaUrl = findMediaUrl(data, "mp4", "best", "tiktok");
          if (!mediaUrl) {
            const candidates = [
              data?.video?.noWatermark, data?.video?.no_watermark,
              data?.video?.downloadAddr, data?.video?.download_addr,
              data?.video?.playAddr, data?.video?.play_addr,
              data?.data?.video?.noWatermark, data?.data?.video?.no_watermark,
              data?.data?.video?.downloadAddr, data?.data?.video?.download_addr,
              data?.data?.video?.playAddr, data?.data?.video?.play_addr,
              data?.data?.noWatermark, data?.data?.no_watermark,
              data?.noWatermark, data?.no_watermark,
              data?.downloadUrl, data?.download_url
            ];
            mediaUrl = candidates.find(v => typeof v === "string" && isHttpUrl(v)) || null;
          }
          if (!mediaUrl) {
            return json({ success: false, error: "URL video tidak ditemukan." }, 502);
          }

          const fileResponse = await fetch(mediaUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!fileResponse.ok) {
            return json({ success: false, error: "Gagal mengambil video." }, 502);
          }

          const headers = new Headers(fileResponse.headers);
          headers.set("Content-Disposition", 'attachment; filename="' + safeFilename(title, "mp4") + '"');
          if (!headers.get("Content-Type")) headers.set("Content-Type", "video/mp4");
          headers.set("Cache-Control", "no-store");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(fileResponse.body, { status: fileResponse.status, headers });
        } catch (error) {
          return json({ success: false, error: error?.message || "Gagal mengambil TikTok." }, 502);
        }
      }

      if (specialProvider === "instagram-new") {
        const sourceUrl = requestUrl.searchParams.get("sourceUrl");
        const format = requestUrl.searchParams.get("format") || "mp4";
        const title = requestUrl.searchParams.get("title") || "Instagram-Media";

        if (!sourceUrl || !isHttpUrl(sourceUrl) || !["mp4", "jpg"].includes(format)) {
          return json({ success: false, error: "Parameter tidak valid." }, 400);
        }

        try {
          const u = new URL("https://" + CONFIG.INSTAGRAM_API_HOST + CONFIG.INSTAGRAM_API_PATH);
          u.searchParams.set("url", sourceUrl);

          const apiResponse = await rapidGet(u.toString(), env, CONFIG.INSTAGRAM_API_HOST);
          const data = await apiResponse.json().catch(() => ({}));

          if (!apiResponse.ok) {
            return json({ success: false, error: data?.message || data?.error || "Instagram API HTTP " + apiResponse.status }, 502);
          }

          const mediaUrl = findMediaUrl(data, format, "best", "instagram");
          if (!mediaUrl) {
            return json({ success: false, error: "URL media tidak ditemukan." }, 502);
          }

          const mediaResponse = await fetch(mediaUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!mediaResponse.ok) {
            return json({ success: false, error: "Gagal mengambil media." }, 502);
          }

          const headers = new Headers(mediaResponse.headers);
          headers.set("Content-Disposition", 'attachment; filename="' + safeFilename(title, format) + '"');
          if (!headers.get("Content-Type")) {
            headers.set("Content-Type", format === "jpg" ? "image/jpeg" : "video/mp4");
          }
          headers.set("Cache-Control", "no-store");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(mediaResponse.body, { status: mediaResponse.status, headers });
        } catch (error) {
          return json({ success: false, error: error?.message || "Gagal mengambil Instagram." }, 502);
        }
      }

      const mediaUrl = requestUrl.searchParams.get("url");
      const format = requestUrl.searchParams.get("format") || "mp4";
      const title = requestUrl.searchParams.get("title") || "GHZ-Media";

      if (!mediaUrl || !isHttpUrl(mediaUrl)) {
        return json({ success: false, error: "URL media tidak valid." }, 400);
      }

      if (!["mp4", "mp3", "jpg"].includes(format)) {
        return json({ success: false, error: "Format file tidak didukung." }, 400);
      }

      try {
        const upstreamHeaders = {};
        const range = request.headers.get("Range");
        if (range) upstreamHeaders["Range"] = range;

        const mediaResponse = await fetchWithTimeout(
          mediaUrl,
          {
            method: request.method,
            headers: upstreamHeaders,
            redirect: "follow"
          },
          60000
        );

        if (!mediaResponse.ok && mediaResponse.status !== 206) {
          return json({ success: false, error: "Server media HTTP " + mediaResponse.status }, 502);
        }

        const upstreamType = (mediaResponse.headers.get("Content-Type") || "").toLowerCase();

        if (request.method === "GET") {
          if (format === "mp4" && /^(image\/|text\/html|application\/json)/.test(upstreamType)) {
            return json({ success: false, error: "Provider mengembalikan bukan video." }, 502);
          }
          if (format === "mp3" && /^(image\/|video\/|text\/html|application\/json)/.test(upstreamType)) {
            return json({ success: false, error: "Provider mengembalikan bukan audio." }, 502);
          }
        }

        const headers = new Headers(mediaResponse.headers);

        let outputExt = format;
        if (format === "mp3") {
          if (/audio\/(mp4|m4a)/i.test(upstreamType)) outputExt = "m4a";
          else if (/audio\/webm/i.test(upstreamType)) outputExt = "webm";
          else if (/audio\/ogg/i.test(upstreamType)) outputExt = "ogg";
          else if (/audio\/mpeg/i.test(upstreamType)) outputExt = "mp3";
          else {
            try {
              const path = new URL(mediaUrl).pathname.toLowerCase();
              const m = path.match(/\.([a-z0-9]{2,5})$/);
              if (m && ["mp3", "m4a", "webm", "ogg", "aac"].includes(m[1])) outputExt = m[1];
            } catch {}
          }
        }

        const filename = safeFilename(title, outputExt);
        headers.set("Content-Disposition", 'attachment; filename="' + filename.replace(/"/g, "") + '"');

        if (!headers.get("Content-Type")) {
          const mimeMap = {
            mp3: outputExt === "m4a" ? "audio/mp4" : outputExt === "webm" ? "audio/webm" : outputExt === "ogg" ? "audio/ogg" : "audio/mpeg",
            jpg: "image/jpeg",
            mp4: "video/mp4"
          };
          headers.set("Content-Type", mimeMap[format] || "application/octet-stream");
        }

        headers.set("Cache-Control", "no-store");
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(mediaResponse.body, {
          status: mediaResponse.status,
          statusText: mediaResponse.statusText,
          headers
        });
      } catch (error) {
        console.error("File proxy error:", error);
        return json({ success: false, error: error?.message || "Gagal mengambil file." }, 502);
      }
    }

    if (requestUrl.pathname === "/api/download") {
      const sourceUrl = requestUrl.searchParams.get("url");
      const format = requestUrl.searchParams.get("format") || "mp4";
      const quality = requestUrl.searchParams.get("quality") || "best";
      let platform = requestUrl.searchParams.get("platform") || "auto";

      if (!sourceUrl) {
        return json({ error: "Parameter url wajib diisi." }, 400);
      }

      if (!["mp4", "mp3", "jpg"].includes(format)) {
        return json({ error: "Format harus mp4, mp3, atau jpg." }, 400);
      }

      try {
        const parsed = new URL(sourceUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return json({ error: "URL harus menggunakan HTTP atau HTTPS." }, 400);
        }
      } catch {
        return json({ error: "URL tidak valid." }, 400);
      }

      if (platform === "auto") {
        platform = detectPlatform(sourceUrl);
      }

      if (requestUrl.searchParams.get("raw") === "1") {
        try {
          const providerResponse = await rawProviderRequest(sourceUrl, platform, env, format, quality);
          const headers = new Headers(providerResponse.headers);
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(providerResponse.body, {
            status: providerResponse.status,
            statusText: providerResponse.statusText,
            headers
          });
        } catch (error) {
          return json({ success: false, error: error?.message || "Gagal mengambil respons API." }, 502);
        }
      }

      if (!["youtube", "tiktok", "facebook", "instagram"].includes(platform)) {
        return json({ error: "Platform tidak didukung." }, 400);
      }

      try {
        let result;
        switch (platform) {
          case "youtube":
            result = await youtubeRequest(sourceUrl, format, env, quality);
            break;
          case "facebook":
            result = await facebookRequest(sourceUrl, format, env);
            break;
          case "tiktok":
          case "instagram":
            result = await socialRequest(sourceUrl, platform, format, env);
            break;
          default:
            return json({ error: "Platform tidak didukung." }, 400);
        }
        return json(result);
      } catch (error) {
        console.error("Download error:", error);
        return json({ success: false, error: error?.message || "Gagal memproses media." }, 502);
      }
    }

    return json({ error: "Not Found" }, 404);
  }
};
