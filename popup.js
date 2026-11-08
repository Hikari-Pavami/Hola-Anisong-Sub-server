// popup.js
const API_BASE = "https://hola-anisong-backend.hola-sub.workers.dev";
const CURRENT_VERSION = "1.1.0";
const DEFAULT_VERSION_URL = "https://raw.githubusercontent.com/holasub/hola-anisong-extension/main/version.json";

let directoryData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ver info
    initVersionUI();

    initTabs();

    await loadSavedStyle();

    await initDirectory();

    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('localSubUpload').addEventListener('change', handleLocalSubUpload);
    await loadExtensionState();
    document.getElementById('btn-toggle-ext').addEventListener('click', toggleExtension);

    document.getElementById('offsetInput').addEventListener('input', applyOffset);
    document.getElementById('btn-sync-now').addEventListener('click', triggerSyncNow);
    document.getElementById('btn-offset-minus').addEventListener('click', () => adjustOffset(-0.5));
    document.getElementById('btn-offset-plus').addEventListener('click', () => adjustOffset(0.5));
    document.getElementById('btn-offset-reset').addEventListener('click', () => {
        document.getElementById('offsetInput').value = "0";
        applyOffset();
    });

    const styleInputs = ['fontColor', 'outlineColor', 'fontSize', 'outlineThickness'];
    styleInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { saveStyle(); updatePreview(); });
    });

    const styleCheckboxes = ['fontBold', 'fontItalic', 'fontUnderline', 'outlineEnabled', 'useCustomStyle'];
    styleCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { saveStyle(); updatePreview(); });
    });

    const fontSelect = document.getElementById('fontFamilySelect');
    if (fontSelect) {
        fontSelect.addEventListener('change', () => { saveStyle(); updatePreview(); });
    }

    const fontUploadInput = document.getElementById('fontUpload');
    if (fontUploadInput) {
        fontUploadInput.addEventListener('change', () => { saveStyle(); updatePreview(); });
    }

    const clearFontBtn = document.getElementById('btn-clear-font');
    if (clearFontBtn) {
        clearFontBtn.addEventListener('click', clearCustomFont);
    }

    document.getElementById('btn-check-version').addEventListener('click', () => checkVersion(true));
    checkVersion(false);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "UPDATE_OFFSET_UI") {
            const offsetInput = document.getElementById('offsetInput');
            offsetInput.value = request.offset.toFixed(2);
            applyOffset();
            showStatus("Đã khớp mốc thời gian với video!");
        }
    });

    document.getElementById('btn-close').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "CLOSE_UI" });
            }
        });
        window.close();
    });
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}

async function initDirectory() {
    try {
        const cached = await chrome.storage.local.get(['directoryCache', 'directoryCacheTime']);
        const now = Date.now();

        if (cached.directoryCache && cached.directoryCacheTime && (now - cached.directoryCacheTime < 600000)) {
            directoryData = cached.directoryCache;
            return;
        }

        showStatus("Đang đồng bộ dữ liệu...");
        const res = await fetch(`${API_BASE}/api/directory`, { cache: 'no-cache' });
        if (!res.ok) throw new Error("API chưa sẵn sàng (" + res.status + ")");

        directoryData = await res.json();
        await chrome.storage.local.set({
            directoryCache: directoryData,
            directoryCacheTime: now
        });
        showStatus("");
    } catch (e) {
        showStatus("Lỗi kết nối: " + e.message);
    }
}

function handleSearch(e) {
    const keyword = e.target.value.toLowerCase().trim();
    const resultsBox = document.getElementById('searchResults');
    resultsBox.innerHTML = '';

    if (!keyword || !directoryData || !directoryData.songs || !directoryData.media) {
        resultsBox.style.display = 'none';
        return;
    }

    const matchedMedia = directoryData.media.filter(m =>
        m.title.toLowerCase().includes(keyword)
    ).slice(0, 3);

    const matchedMediaIds = matchedMedia.map(m => m.id);

    const matchedSongs = directoryData.songs.filter(song => {
        const matchName = song.song_name.toLowerCase().includes(keyword);
        const matchMedia = matchedMediaIds.includes(song.media_id);
        return matchName || matchMedia;
    }).slice(0, 10);

    let hasResult = false;

    if (matchedMedia.length > 0) {
        hasResult = true;
        matchedMedia.forEach(media => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.textContent = `🎬 ${media.title}`;
            div.style.backgroundColor = '#81C784';
            div.style.borderLeft = '5px solid #2e7d32';
            div.style.fontWeight = 'bold';

            div.onclick = () => {
                const searchInput = document.getElementById('searchInput');
                searchInput.value = media.title;
                searchInput.dispatchEvent(new Event('input'));
            };
            resultsBox.appendChild(div);
        });
    }

    if (matchedSongs.length > 0) {
        hasResult = true;
        matchedSongs.forEach(song => {
            const media = directoryData.media.find(m => m.id === song.media_id);
            const mediaTitle = media ? media.title : 'Không rõ phim';

            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `🎵 <strong>${song.song_name}</strong><br><span style="font-size: 11px; color: #555;">${mediaTitle}</span>`;

            div.onclick = () => loadSubtitle(song);
            resultsBox.appendChild(div);
        });
    }

    resultsBox.style.display = hasResult ? 'block' : 'none';
}

async function loadSubtitle(song) {
    document.getElementById('searchResults').style.display = 'none';
    showStatus("Đang tải phụ đề: " + song.song_name + "...");

    try {
        const cacheKey = `sub_${song.default_video_id}`;
        const cached = await chrome.storage.local.get([cacheKey, `${cacheKey}_time`]);
        const now = Date.now();

        let subContent = "";

        if (cached[cacheKey] && cached[`${cacheKey}_time`] && (now - cached[`${cacheKey}_time`] < 259200000)) {
            subContent = cached[cacheKey];
        } else {
            const res = await fetch(`${API_BASE}/api/subtitle?videoId=${song.default_video_id}`);
            if (!res.ok) throw new Error("Không tìm thấy phụ đề trên máy chủ");
            subContent = await res.text();

            const toSave = {};
            toSave[cacheKey] = subContent;
            toSave[`${cacheKey}_time`] = now;
            await chrome.storage.local.set(toSave);
        }

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "LOAD_SUBTITLE",
                    content: subContent,
                    extension: song.file_key.split('.').pop()
                });
                showStatus("Tải phụ đề thành công.");
            } else {
                showStatus("Hãy mở video YouTube tương ứng để hiển thị!");
            }
        });
    } catch (e) {
        showStatus("Lỗi tải phụ đề: " + e.message);
    }
}

function handleLocalSubUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['ass', 'srt', 'vtt'].includes(extension)) {
        showStatus("Chỉ hỗ trợ định dạng .ass, .srt, .vtt");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const subContent = event.target.result;
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "LOAD_SUBTITLE",
                    content: subContent,
                    extension: extension
                });
                showStatus("Đã hiển thị phụ đề từ tệp.");
            } else {
                showStatus("Vui lòng mở video YouTube để xem phụ đề.");
            }
        });
        e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
}

async function loadSavedStyle() {
    const saved = await chrome.storage.local.get(['subStyle', 'subOffset']);

    if (saved.subStyle) {
        const s = saved.subStyle;
        if (s.color) document.getElementById('fontColor').value = s.color;
        if (s.outline) document.getElementById('outlineColor').value = s.outline;
        if (s.fontSize) document.getElementById('fontSize').value = s.fontSize;
        if (s.outlineThickness !== undefined) document.getElementById('outlineThickness').value = s.outlineThickness;
        document.getElementById('fontBold').checked = s.bold !== false;
        document.getElementById('fontItalic').checked = s.italic || false;
        document.getElementById('fontUnderline').checked = s.underline || false;
        document.getElementById('outlineEnabled').checked = s.outlineEnabled !== false;
        document.getElementById('useCustomStyle').checked = s.useCustomStyle !== false;

        if (s.fontFamily && document.getElementById('fontFamilySelect')) {
            document.getElementById('fontFamilySelect').value = s.fontFamily;
        }

        if (s.customFontBase64) {
            showCustomFontActiveUI();
        }
    }

    if (saved.subOffset !== undefined) {
        document.getElementById('offsetInput').value = saved.subOffset;
    }

    updatePreview();
}

function showCustomFontActiveUI() {
    const badge = document.getElementById('customFontStatus');
    const clearBtn = document.getElementById('btn-clear-font');
    if (badge) {
        badge.textContent = "✓ Đang kích hoạt Font riêng của bạn";
        badge.style.display = 'block';
    }
    if (clearBtn) {
        clearBtn.style.display = 'inline-block';
    }
}

async function clearCustomFont() {
    const saved = await chrome.storage.local.get(['subStyle']);
    if (saved.subStyle) {
        saved.subStyle.customFontBase64 = null;
        await chrome.storage.local.set({ subStyle: saved.subStyle });
    }
    document.getElementById('fontUpload').value = '';
    const badge = document.getElementById('customFontStatus');
    const clearBtn = document.getElementById('btn-clear-font');
    if (badge) badge.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';

    await saveStyle();
    updatePreview();
    showStatus("Đã quay lại font tiêu chuẩn.");
}

async function saveStyle() {
    const fileInput = document.getElementById('fontUpload');
    const styleData = {
        color: document.getElementById('fontColor').value,
        outline: document.getElementById('outlineColor').value,
        fontSize: parseInt(document.getElementById('fontSize').value) || 22,
        outlineThickness: parseFloat(document.getElementById('outlineThickness').value) || 0,
        bold: document.getElementById('fontBold').checked,
        italic: document.getElementById('fontItalic').checked,
        underline: document.getElementById('fontUnderline').checked,
        outlineEnabled: document.getElementById('outlineEnabled').checked,
        useCustomStyle: document.getElementById('useCustomStyle').checked,
        fontFamily: document.getElementById('fontFamilySelect').value,
        customFontBase64: null
    };

    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            styleData.customFontBase64 = e.target.result;
            showCustomFontActiveUI();
            await commitStyle(styleData);
            updatePreview(styleData);
        };
        reader.readAsDataURL(file);
    } else {
        const saved = await chrome.storage.local.get(['subStyle']);
        if (saved.subStyle && saved.subStyle.customFontBase64) {
            styleData.customFontBase64 = saved.subStyle.customFontBase64;
        }
        await commitStyle(styleData);
        updatePreview(styleData);
    }
}

async function commitStyle(styleData) {
    await chrome.storage.local.set({ subStyle: styleData });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "UPDATE_STYLE",
                style: styleData
            });
        }
    });
}

function updatePreview(overrideStyle = null) {
    const preview = document.getElementById('previewText');
    if (!preview) return;

    const color = overrideStyle ? overrideStyle.color : document.getElementById('fontColor').value;
    const outline = overrideStyle ? overrideStyle.outline : document.getElementById('outlineColor').value;
    const outlineEnabled = overrideStyle ? overrideStyle.outlineEnabled : document.getElementById('outlineEnabled').checked;
    const thick = overrideStyle ? overrideStyle.outlineThickness : (parseFloat(document.getElementById('outlineThickness').value) || 0);
    const fontSize = overrideStyle ? overrideStyle.fontSize : (parseInt(document.getElementById('fontSize').value) || 22);
    const bold = overrideStyle ? overrideStyle.bold : document.getElementById('fontBold').checked;
    const italic = overrideStyle ? overrideStyle.italic : document.getElementById('fontItalic').checked;
    const underline = overrideStyle ? overrideStyle.underline : document.getElementById('fontUnderline').checked;
    const familyKey = overrideStyle ? overrideStyle.fontFamily : document.getElementById('fontFamilySelect').value;

    preview.style.color = color;
    preview.style.fontSize = Math.min(26, Math.max(14, fontSize)) + 'px';
    preview.style.fontWeight = bold ? '800' : '500';
    preview.style.fontStyle = italic ? 'italic' : 'normal';
    preview.style.textDecoration = underline ? 'underline' : 'none';
    preview.style.paintOrder = 'stroke fill';

    if (outlineEnabled) {
        preview.style.webkitTextStroke = `${thick * 2}px ${outline}`;
        preview.style.textShadow = `0px 2px 4px rgba(0,0,0,0.85)`;
    } else {
        preview.style.webkitTextStroke = '0px transparent';
        preview.style.textShadow = '0px 2px 4px rgba(0,0,0,0.6)';
    }

    if (familyKey === 'be-vietnam-pro') {
        preview.style.fontFamily = "'Be Vietnam Pro', sans-serif";
    } else if (familyKey === 'system') {
        preview.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    } else {
        preview.style.fontFamily = "'Montserrat', sans-serif";
    }
}

function triggerSyncNow() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "CALC_SYNC_NOW" });
        } else {
            showStatus("Vui lòng mở video YouTube.");
        }
    });
}

function adjustOffset(delta) {
    const input = document.getElementById('offsetInput');
    let current = parseFloat(input.value) || 0;
    current = Math.round((current + delta) * 10) / 10;
    input.value = current;
    applyOffset();
}

function applyOffset() {
    const offsetValue = parseFloat(document.getElementById('offsetInput').value) || 0;
    chrome.storage.local.set({ subOffset: offsetValue });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "APPLY_OFFSET",
                offset: offsetValue
            });
        }
    });
}

async function loadExtensionState() {
    const saved = await chrome.storage.local.get(['extEnabled']);
    const isEnabled = saved.extEnabled !== false;
    updateToggleButtonUI(isEnabled);
}

async function toggleExtension() {
    const saved = await chrome.storage.local.get(['extEnabled']);
    const newState = saved.extEnabled === false ? true : false;

    await chrome.storage.local.set({ extEnabled: newState });
    updateToggleButtonUI(newState);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "TOGGLE_EXTENSION",
                enabled: newState
            });
        }
    });
}

function updateToggleButtonUI(isEnabled) {
    const btn = document.getElementById('btn-toggle-ext');
    if (isEnabled) {
        btn.textContent = "ĐANG BẬT";
        btn.style.backgroundColor = "var(--primary-green)";
        btn.style.color = "#121212";
    } else {
        btn.textContent = "ĐANG TẮT";
        btn.style.backgroundColor = "var(--danger-red)";
        btn.style.color = "#ffffff";
    }
}

function initVersionUI() {
    const vTag = document.getElementById('headerVersionTag');
    const vDisplay = document.getElementById('currentVersionDisplay');
    if (vTag) vTag.textContent = 'v' + CURRENT_VERSION;
    if (vDisplay) vDisplay.textContent = 'v' + CURRENT_VERSION;
}

function compareVersions(v1, v2) {
    const clean1 = (v1 || '').replace(/^[^\d]*/, '');
    const clean2 = (v2 || '').replace(/^[^\d]*/, '');
    const parts1 = clean1.split('.').map(n => parseInt(n) || 0);
    const parts2 = clean2.split('.').map(n => parseInt(n) || 0);

    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}

async function checkVersion(force = false) {
    const statusBox = document.getElementById('versionStatusBox');
    const updateCard = document.getElementById('updateAvailableCard');
    const tabBadge = document.getElementById('tabVersionBadge');
    const headerTag = document.getElementById('headerVersionTag');

    if (!force) {
        const cached = await chrome.storage.local.get(['versionCheckTime', 'versionCheckData']);
        const now = Date.now();
        if (cached.versionCheckData && cached.versionCheckTime && (now - cached.versionCheckTime < 14400000)) { // 4 giờ
            renderVersionResult(cached.versionCheckData);
            return;
        }
    }

    if (statusBox) {
        statusBox.className = "version-status-box";
        statusBox.textContent = "Đang kiểm tra phiên bản mới...";
    }

    try {
        const res = await fetch(`${DEFAULT_VERSION_URL}?_t=${Date.now()}`, { cache: 'no-cache' });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Không thể đọc file version.json`);
        }

        const data = await res.json();
        await chrome.storage.local.set({
            versionCheckTime: Date.now(),
            versionCheckData: data
        });

        renderVersionResult(data);
    } catch (err) {
        console.warn("[Hola Anisong] Không thể kiểm tra phiên bản:", err);
        if (statusBox) {
            statusBox.className = "version-status-box status-error";
            statusBox.textContent = "Chưa kết nối được máy chủ cập nhật. Vui lòng kiểm tra lại kết nối mạng.";
        }
    }
}

function renderVersionResult(data) {
    const statusBox = document.getElementById('versionStatusBox');
    const updateCard = document.getElementById('updateAvailableCard');
    const tabBadge = document.getElementById('tabVersionBadge');
    const headerTag = document.getElementById('headerVersionTag');

    if (!data || !data.version) return;

    const isNewer = compareVersions(data.version, CURRENT_VERSION) > 0;

    if (isNewer) {
        // Có bản cập nhật mới!
        if (statusBox) {
            statusBox.className = "version-status-box status-update";
            statusBox.innerHTML = `<strong>Đã phát hiện bản mới (v${data.version})!</strong> Vui lòng xem thông tin bên dưới.`;
        }

        if (updateCard) {
            updateCard.style.display = 'block';
            document.getElementById('newVersionTag').textContent = 'v' + data.version;
            document.getElementById('newVersionDate').textContent = data.release_date || 'Gần đây';

            const changelogUl = document.getElementById('changelogList');
            changelogUl.innerHTML = '';
            if (Array.isArray(data.changelog)) {
                data.changelog.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    changelogUl.appendChild(li);
                });
            }

            const downloadBtn = document.getElementById('btn-download-update');
            if (downloadBtn && data.download_url) {
                downloadBtn.href = data.download_url;
            }
        }

        if (tabBadge) tabBadge.style.display = 'inline-block';
        if (headerTag) {
            headerTag.textContent = `v${CURRENT_VERSION} (BẢN MỚI!)`;
            headerTag.style.backgroundColor = 'var(--primary-yellow)';
            headerTag.style.borderColor = 'var(--danger-red)';
        }
    } else {
        if (statusBox) {
            statusBox.className = "version-status-box status-success";
            statusBox.textContent = `Bạn đang sử dụng phiên bản mới nhất (${CURRENT_VERSION}).`;
        }
        if (updateCard) updateCard.style.display = 'none';
        if (tabBadge) tabBadge.style.display = 'none';
        if (headerTag) {
            headerTag.textContent = 'v' + CURRENT_VERSION;
            headerTag.style.backgroundColor = '#ffffff';
            headerTag.style.borderColor = 'var(--border-color)';
        }
    }
}

function showStatus(msg) {
    const statusDiv = document.getElementById('statusMsg');
    if (!statusDiv) return;
    statusDiv.textContent = msg;
    setTimeout(() => {
        if (statusDiv.textContent === msg) statusDiv.textContent = "";
    }, 3000);
}
