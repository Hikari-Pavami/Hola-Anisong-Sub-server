const API_BASE = "https://hola-anisong-backend.hola-sub.workers.dev";
let directoryData = null;

document.addEventListener('DOMContentLoaded', async () => {    
    loadSavedStyle();

    await initDirectory();

    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('localSubUpload').addEventListener('change', handleLocalSubUpload);
    await loadExtensionState();
    document.getElementById('btn-toggle-ext').addEventListener('click', toggleExtension);

    document.getElementById('offsetInput').addEventListener('input', applyOffset);
    document.getElementById('btn-sync-now').addEventListener('click', triggerSyncNow);

    const styleInputs = ['fontColor', 'outlineColor', 'fontSize', 'outlineThickness'];
    styleInputs.forEach(id => document.getElementById(id).addEventListener('input', saveStyle));
    
    const styleCheckboxes = ['fontBold', 'fontItalic', 'fontUnderline', 'outlineEnabled', 'useCustomStyle'];
    styleCheckboxes.forEach(id => document.getElementById(id).addEventListener('change', saveStyle));

    document.getElementById('fontUpload').addEventListener('change', saveStyle);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>
    {
        if (request.action === "UPDATE_OFFSET_UI")
        {
            const offsetInput = document.getElementById('offsetInput');
            offsetInput.value = request.offset.toFixed(2); 
            applyOffset();
            showStatus("Đã khớp phụ đề với video!");
        }
    });
    
    document.getElementById('btn-close').addEventListener('click', () =>
    {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
        {
            if (tabs[0] && tabs[0].url.includes("youtube.com/watch"))
            {
                chrome.tabs.sendMessage(tabs[0].id, { action: "CLOSE_UI" });
            }
        });        
        window.close();
    });
});

async function initDirectory()
{
    try
    {
        const cached = await chrome.storage.local.get(['directoryCache', 'directoryCacheTime']);
        const now = Date.now();
                
        if (cached.directoryCache && cached.directoryCacheTime && (now - cached.directoryCacheTime < 600000))
        {
            directoryData = cached.directoryCache;
            return;
        }

        showStatus("Đang cập nhật dữ liệu...");
        const res = await fetch(`${API_BASE}/api/directory`, { cache: 'no-cache' });
        if (!res.ok) throw new Error("API lỗi hoặc đã bị đóng.");
        
        directoryData = await res.json();
        await chrome.storage.local.set
        (
            { 
                directoryCache: directoryData, 
                directoryCacheTime: now 
            }
        );
        showStatus("");
    }
    catch (e)
    {
        showStatus("Lỗi tải dữ liệu: " + e.message);
    }
}

function handleSearch(e)
{
    const keyword = e.target.value.toLowerCase().trim();
    const resultsBox = document.getElementById('searchResults');
    resultsBox.innerHTML = '';

    if (!keyword || !directoryData || !directoryData.songs || !directoryData.media)
    {
        resultsBox.style.display = 'none';
        return;
    }

    const matchedMedia = directoryData.media.filter(m => 
        m.title.toLowerCase().includes(keyword)
    ).slice(0, 3);

    const matchedMediaIds = matchedMedia.map(m => m.id);

    const matchedSongs = directoryData.songs.filter(song =>
    {
        const matchName = song.song_name.toLowerCase().includes(keyword);
        const matchMedia = matchedMediaIds.includes(song.media_id);
        return matchName || matchMedia;
    }).slice(0, 10);

    let hasResult = false;

    if (matchedMedia.length > 0)
    {
        hasResult = true;
        matchedMedia.forEach(media =>
        {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.textContent = `${media.title}`;
                        
            div.style.backgroundColor = '#00b106'; 
            div.style.borderLeft = '4px solid var(--primary-green, #aebd54)';
            div.style.fontWeight = 'bold';
            
            div.onclick = () =>
            {
                const searchInput = document.getElementById('searchInput');
                searchInput.value = media.title;
                searchInput.dispatchEvent(new Event('input'));
            };
            resultsBox.appendChild(div);
        });
    }

    if (matchedSongs.length > 0)
    {
        hasResult = true;
        matchedSongs.forEach(song =>
        {
            const media = directoryData.media.find(m => m.id === song.media_id);
            const mediaTitle = media ? media.title : 'Lỗi tên phim';
            
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `🎵 ${song.song_name} <br><span style="font-size: 11px; color: #aaa; font-weight: normal;">${mediaTitle}</span>`;
            
            div.onclick = () => loadSubtitle(song);
            resultsBox.appendChild(div);
        });
    }

    resultsBox.style.display = hasResult ? 'block' : 'none';
}

async function loadSubtitle(song)
{
    document.getElementById('searchResults').style.display = 'none';
    showStatus("Đang tải phụ đề...");

    try
    {
        const cacheKey = `sub_${song.default_video_id}`;
        const cached = await chrome.storage.local.get([cacheKey, `${cacheKey}_time`]);
        const now = Date.now();

        let subContent = "";

        if (cached[cacheKey] && cached[`${cacheKey}_time`] && (now - cached[`${cacheKey}_time`] < 259200000))
        {
            subContent = cached[cacheKey];
        }
        else
        {
            const res = await fetch(`${API_BASE}/api/subtitle?videoId=${song.default_video_id}`);
            if (!res.ok) throw new Error("Không tìm thấy phụ đề");
            subContent = await res.text();
            
            const toSave = {};
            toSave[cacheKey] = subContent;
            toSave[`${cacheKey}_time`] = now;
            await chrome.storage.local.set(toSave);
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
        {
            if (tabs[0].url.includes("youtube.com/watch"))
            {
                chrome.tabs.sendMessage(tabs[0].id,
                {
                    action: "LOAD_SUBTITLE",
                    content: subContent,
                    extension: song.file_key.split('.').pop()
                });
                showStatus("Đã tải phụ đề.");
            }
        });
    }
    catch (e)
    {
        showStatus(e.message);
    }
}

function handleLocalSubUpload(e)
{
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['ass', 'srt', 'vtt'].includes(extension))
    {
        showStatus("Chỉ hỗ trợ định dạng .ass, .srt, .vtt");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) =>
    {
        const subContent = event.target.result;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
        {
            if (tabs[0] && tabs[0].url.includes("youtube.com/watch"))
            {
                chrome.tabs.sendMessage(tabs[0].id,
                {
                    action: "LOAD_SUBTITLE",
                    content: subContent,
                    extension: extension
                });
                showStatus("Đã tải phụ đề từ máy.");
            }
        });
        e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
}

const styleInputs = ['fontColor', 'outlineColor', 'fontSize', 'outlineThickness'];
const styleCheckboxes = ['fontBold', 'fontItalic', 'fontUnderline', 'outlineEnabled', 'useCustomStyle'];

async function loadSavedStyle()
{
    const saved = await chrome.storage.local.get(['subStyle', 'subOffset']);
    
    if (saved.subStyle)
    {
        document.getElementById('fontColor').value = saved.subStyle.color || '#ffffff';
        document.getElementById('outlineColor').value = saved.subStyle.outline || '#000000';
        document.getElementById('fontSize').value = saved.subStyle.fontSize || 20;
        document.getElementById('outlineThickness').value = saved.subStyle.outlineThickness !== undefined ? saved.subStyle.outlineThickness : 2;
        document.getElementById('fontBold').checked = saved.subStyle.bold || false;
        document.getElementById('fontItalic').checked = saved.subStyle.italic || false;
        document.getElementById('fontUnderline').checked = saved.subStyle.underline || false;
        document.getElementById('outlineEnabled').checked = saved.subStyle.outlineEnabled !== false;
        document.getElementById('useCustomStyle').checked = saved.subStyle.useCustomStyle !== false;
    }
    
    if (saved.subOffset !== undefined)
    {
        document.getElementById('offsetInput').value = saved.subOffset;
    }
}

async function saveStyle()
{
    const fileInput = document.getElementById('fontUpload');
    const styleData = {
        color: document.getElementById('fontColor').value,
        outline: document.getElementById('outlineColor').value,
        fontSize: document.getElementById('fontSize').value,
        outlineThickness: parseFloat(document.getElementById('outlineThickness').value) || 0,
        bold: document.getElementById('fontBold').checked,
        italic: document.getElementById('fontItalic').checked,
        underline: document.getElementById('fontUnderline').checked,
        outlineEnabled: document.getElementById('outlineEnabled').checked,
        useCustomStyle: document.getElementById('useCustomStyle').checked,
        customFontBase64: null
    };

    if (fileInput.files.length > 0)
    {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) =>
        {
            styleData.customFontBase64 = e.target.result;
            await commitStyle(styleData);
        };
        reader.readAsDataURL(file);
    }
    else
    {
        const saved = await chrome.storage.local.get(['subStyle']);
        if (saved.subStyle && saved.subStyle.customFontBase64)
        {
            styleData.customFontBase64 = saved.subStyle.customFontBase64;
        }
        await commitStyle(styleData);
    }
}

async function commitStyle(styleData)
{
    await chrome.storage.local.set({ subStyle: styleData });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        if (tabs[0] && tabs[0].url.includes("youtube.com/watch"))
        {
            chrome.tabs.sendMessage(tabs[0].id,
            {
                action: "UPDATE_STYLE",
                style: styleData
            });
        }
    });
}

function triggerSyncNow()
{
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        if (tabs[0] && tabs[0].url.includes("youtube.com/watch"))
        {
            chrome.tabs.sendMessage(tabs[0].id, { action: "CALC_SYNC_NOW" });
        }
        else
        {
            showStatus("Hãy mở video YouTube.");
        }
    });
}

function applyOffset()
{
    const offsetValue = parseFloat(document.getElementById('offsetInput').value) || 0;
    chrome.storage.local.set({ subOffset: offsetValue });
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        if (tabs[0] && tabs[0].url.includes("youtube.com/watch"))
        {
            chrome.tabs.sendMessage(tabs[0].id,
            {
                action: "APPLY_OFFSET",
                offset: offsetValue
            });
        }
    });
}

function showStatus(msg)
{
    const statusDiv = document.getElementById('statusMsg');
    statusDiv.textContent = msg;
    setTimeout(() => { if(statusDiv.textContent === msg) statusDiv.textContent = ""; }, 2500);
}

async function loadExtensionState()
{
    const saved = await chrome.storage.local.get(['extEnabled']);
    const isEnabled = saved.extEnabled !== false;
    updateToggleButtonUI(isEnabled);
}

async function toggleExtension()
{
    const saved = await chrome.storage.local.get(['extEnabled']);
    const newState = saved.extEnabled === false ? true : false;
    
    await chrome.storage.local.set({ extEnabled: newState });
    updateToggleButtonUI(newState);
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        if (tabs[0] && tabs[0].url.includes("youtube.com/watch"))
        {
            chrome.tabs.sendMessage(tabs[0].id,
            {
                action: "TOGGLE_EXTENSION",
                enabled: newState
            });
        }
    });
}

function updateToggleButtonUI(isEnabled)
{
    const btn = document.getElementById('btn-toggle-ext');
    if (isEnabled)
    {
        btn.textContent = "ĐANG BẬT";
        btn.style.backgroundColor = "var(--primary-green)";
        btn.style.color = "#121212";
    }
    else
    {
        btn.textContent = "ĐANG TẮT";
        btn.style.backgroundColor = "#FF5252";
        btn.style.color = "#ffffff";
    }
}