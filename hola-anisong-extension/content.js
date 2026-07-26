const API_BASE = "https://hola-anisong-backend.hola-sub.workers.dev";

console.log("--- HOLA ANISONG: TRUNG TÂM LƯU TRỮ PHỤ ĐỀ ---");
try
{
    const btn = document.querySelector('.ytp-right-controls');
    console.log("--- HOLA ANISONG: ĐIỀU KHIỂN HỢP LỆ:", !!btn);
}
catch (e)
{
    console.error("--- HOLA ANISONG LỖI:", e);
}

let subtitles = [];
let currentOffset = 0;
let subContainer = null;
let currentStyle = {};
let syncInterval = null;
let isExtensionEnabled = true;

async function checkAndAutoLoadSubtitle()
{
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    console.log("[DEBUG] Đang kiểm tra video:", videoId);
    if (!videoId) return;

    try
    {
        let cached = await chrome.storage.local.get(['directoryCache', 'directoryCacheTime']);
        let directoryData = cached.directoryCache;
        const now = Date.now();

        if (!directoryData || !cached.directoryCacheTime || (now - cached.directoryCacheTime > 600000))
        {
            console.log("[DEBUG] Cache hết hạn hoặc chưa có, đang gọi API...");
            const res = await fetch(`${API_BASE}/api/directory`, { cache: 'no-cache' });
            if (!res.ok) throw new Error("API lỗi: " + res.status);
            directoryData = await res.json();
            await chrome.storage.local.set({ directoryCache: directoryData, directoryCacheTime: now });
        }
        
        const song = directoryData.songs.find(s => s.default_video_id === videoId);
        if (!song)
        {
            console.log("[DEBUG] Video này không được hỗ trợ.");
            return; 
        }
        console.log("[DEBUG] Tìm thấy bài hát:", song.song_name);

        const resSub = await fetch(`${API_BASE}/api/subtitle?videoId=${videoId}`);
        if (!resSub.ok) throw new Error("API lỗi: " + resSub.status);
        const subContent = await resSub.text();
        
        console.log("[DEBUG] Đã tải xong phụ đề, độ dài:", subContent.length);
        
        if (typeof SubtitleParser === 'undefined')
        {
            console.error("[ERROR] Lỗi bộ giải mã phụ đề.");
            return;
        }

        const extension = song.file_key.split('.').pop();
        subtitles = SubtitleParser.parse(subContent, extension);
        
        currentOffset = 0;
        initSubtitleContainer(); 
        
        startSyncLoop();
        
    }
    catch (e)
    {
        console.error("[HOLA ANISONG ERROR]:", e);
    }
}

document.addEventListener('yt-navigate-finish', checkAndAutoLoadSubtitle);
if (window.location.href.includes('/watch'))
{
    setTimeout(checkAndAutoLoadSubtitle, 1000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>
{
    if (request.action === "LOAD_SUBTITLE")
    {
        subtitles = SubtitleParser.parse(request.content, request.extension);
        currentOffset = 0;
        initSubtitleContainer();
        startSyncLoop();
    }
    else if (request.action === "UPDATE_STYLE")
    {
        currentStyle = request.style;
        applyStyleToContainer();
    }
    else if (request.action === "APPLY_OFFSET")
    {
        currentOffset = request.offset;
    }
    else if (request.action === "CALC_SYNC_NOW")
    {
        const video = document.querySelector('video');
        if (video && subtitles.length > 0)
        {
            currentOffset = video.currentTime - subtitles[0].start;
            chrome.runtime.sendMessage({ action: "UPDATE_OFFSET_UI", offset: currentOffset });
        }
    }
    else if (request.action === "CLOSE_UI")
    {    
        const iframeToHide = document.getElementById('hola-anisong-iframe');
        if (iframeToHide)
        {
            iframeToHide.style.display = 'none';
        }
    }
    else if (request.action === "TOGGLE_EXTENSION")
    {
        isExtensionEnabled = request.enabled;
        if (subContainer)
        {
            subContainer.style.display = isExtensionEnabled ? 'flex' : 'none';
            if (!isExtensionEnabled)
            {
                subContainer.innerHTML = '';
                currentRenderedIds = '';
            }
        }
    }
});

let currentRenderedIds = '';

function initSubtitleContainer()
{
    const videoPlayer = document.querySelector('.html5-video-player');
    if (!videoPlayer) return;

    

    if (!document.getElementById('hola-anisong-styles'))
    {
        const style = document.createElement('style');
        style.id = 'hola-anisong-styles';
        style.textContent = `
            @keyframes karaoke-color {
                100% { color: var(--k-pri-color); }
            }
            .hola-sub-line {
                margin-bottom: 5px;
                line-height: 1.2;
            }
        `;
        document.head.appendChild(style);
    }

    if (!subContainer)
    {
        subContainer = document.createElement('div');
        subContainer.id = 'hola-anisong-sub-container';
        subContainer.style.position = 'absolute';
        subContainer.style.bottom = '10%';
        subContainer.style.width = '100%';
        subContainer.style.textAlign = 'center';
        subContainer.style.pointerEvents = 'none';
        subContainer.style.zIndex = '9999';
        subContainer.style.transition = 'all 0.1s linear';
        subContainer.style.display = 'flex';
        subContainer.style.flexDirection = 'column';
        subContainer.style.alignItems = 'center';
        subContainer.style.justifyContent = 'flex-end';
        
        videoPlayer.appendChild(subContainer);
        
        chrome.storage.local.get(['subStyle', 'subOffset', 'extEnabled'], function(result)
        {
            isExtensionEnabled = result.extEnabled !== false;
            subContainer.style.display = isExtensionEnabled ? 'flex' : 'none';

            if (result.subStyle)
            {
                currentStyle = result.subStyle;
                applyStyleToContainer();
            }
            if (result.subOffset !== undefined)
            {
                currentOffset = result.subOffset;
            }
        });
    }
}

function applyStyleToContainer()
{
    if (!subContainer) return;

    if (currentStyle.useCustomStyle === false)
    {
        subContainer.style.color = '';
        subContainer.style.fontSize = '';
        subContainer.style.fontWeight = '';
        subContainer.style.fontStyle = '';
        subContainer.style.textDecoration = '';
        subContainer.style.textShadow = '';
        subContainer.style.webkitTextStroke = '';
        subContainer.style.fontFamily = '';
        currentRenderedIds = ''; 
        return;
    }
    
    subContainer.style.color = currentStyle.color || '#ffffff';
    subContainer.style.fontSize = (currentStyle.fontSize || 20) + 'px';
    subContainer.style.fontWeight = currentStyle.bold ? 'bold' : 'normal';
    subContainer.style.fontStyle = currentStyle.italic ? 'italic' : 'normal';
    subContainer.style.textDecoration = currentStyle.underline ? 'underline' : 'none';
    
    if (currentStyle.outlineEnabled !== false)
    {
        const outline = currentStyle.outline || '#000000';
        const thick = currentStyle.outlineThickness !== undefined ? currentStyle.outlineThickness : 2;
    
        subContainer.style.webkitTextStroke = `${thick}px ${outline}`;
        // subContainer.style.textShadow = `0px ${thick + 2}px ${thick + 2}px rgba(0,0,0,0.8)`;
    }
    else
    {
        subContainer.style.webkitTextStroke = '0px transparent';
        subContainer.style.textShadow = 'none';
    }

    if (currentStyle.customFontBase64)
    {
        const fontFace = new FontFace('HolaCustomFont', `url(${currentStyle.customFontBase64})`);
        fontFace.load().then(function(loadedFace)
        {
            document.fonts.add(loadedFace);
            subContainer.style.fontFamily = 'HolaCustomFont, sans-serif';
        });
    }
    else
    {
        subContainer.style.fontFamily = 'sans-serif';
    }
    
    currentRenderedIds = ''; 
}

function startSyncLoop()
{
    if (syncInterval) clearInterval(syncInterval);
    
    const video = document.querySelector('video');
    if (!video) return;

    syncInterval = setInterval(() =>
    {
        if (!isExtensionEnabled || !subContainer || subtitles.length === 0) return;

        const currentTime = video.currentTime - currentOffset;
        
        const activeSubs = subtitles.filter(sub => currentTime >= sub.start && currentTime <= sub.end);
        const activeIds = activeSubs.map(s => s.id).join(',');

        if (activeIds !== currentRenderedIds)
        {
            currentRenderedIds = activeIds;
            
            if (activeSubs.length > 0) {
                subContainer.innerHTML = activeSubs.map(sub =>
                {
                    let inlineStyle = '';
                    
                    if (currentStyle.useCustomStyle === false && sub.style)
                    {
                        const s = sub.style;
                        inlineStyle = `
                            color: ${s.primaryColor};
                            font-size: ${s.fontSize}px;
                            font-family: '${s.fontName}', sans-serif;
                            font-weight: ${s.bold ? 'bold' : 'normal'};
                            font-style: ${s.italic ? 'italic' : 'normal'};
                            text-decoration: ${s.underline ? 'underline' : 'none'};
                            -webkit-text-stroke: ${s.outline}px ${s.outlineColor};
                            text-shadow: 0px ${s.outline+2}px ${s.outline+2}px rgba(0,0,0,0.8);
                            --k-pri-color: ${s.primaryColor};
                            --k-sec-color: ${s.secondaryColor};
                        `;
                    }
                    else
                    {
                        inlineStyle = `
                            --k-pri-color: ${currentStyle.color || '#ffffff'};
                            --k-sec-color: ${currentStyle.outlineColor || '#000000'};
                        `;
                    }

                    const htmlText = sub.text.replace(/data-dur="(\d+)" data-delay="(\d+)"/g, (match, dur, delay) =>
                    {
                        const adjustedDelay = parseInt(delay) - (currentTime - sub.start) * 1000;
                        return `style="color: var(--k-sec-color); animation: karaoke-color ${dur}ms linear ${adjustedDelay}ms forwards;"`;
                    });

                    return `<div class="hola-sub-line" style="${inlineStyle.replace(/\n/g, ' ')}">${htmlText}</div>`;
                }).join('');
            }
            else
            {
                subContainer.innerHTML = '';
            }
        }
    }, 100);
}

let extensionIframe = null;

function injectYouTubeButton()
{
    if (document.getElementById('hola-anisong-btn')) return;

    const rightControls = document.querySelector('.ytp-right-controls');
    if (rightControls)
    {
        const btn = document.createElement('button');
        btn.id = 'hola-anisong-btn';
        btn.className = 'ytp-button';
        btn.title = 'Hola Anisong Sub-Ser';
        // btn.style.verticalAlign = 'top';
        
        btn.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
            <path d="M11,11 C9.89,11 9,11.9 9,13 L9,23 C9,24.1 9.89,25 11,25 L25,25 C26.1,25 27,24.1 27,23 L27,13 C27,11.9 26.1,11 25,11 L11,11 Z M17,17 L15.5,17 L15.5,16.5 L13.5,16.5 L13.5,19.5 L15.5,19.5 L15.5,19 L17,19 L17,20 C17,20.55 16.55,21 16,21 L13,21 C12.45,21 12,20.55 12,20 L12,16 C12,15.45 12.45,15 13,15 L16,15 C16.55,15 17,15.45 17,16 L17,17 Z M24,17 L22.5,17 L22.5,16.5 L20.5,16.5 L20.5,19.5 L22.5,19.5 L22.5,19 L24,19 L24,20 C24,20.55 23.55,21 23,21 L20,21 C19.45,21 19,20.55 19,20 L19,16 C19,15.45 19.45,15 20,15 L23,15 C23.55,15 24,15.45 24,16 L24,17 Z" fill="#fff"></path>
        </svg>`;

        btn.onclick = toggleExtensionUI;
        rightControls.insertBefore(btn, rightControls.firstChild);
    }
}

function toggleExtensionUI()
{
    if (!extensionIframe)
    {
        extensionIframe = document.createElement('iframe');
        extensionIframe.src = chrome.runtime.getURL('popup.html');
        extensionIframe.id = 'hola-anisong-iframe';
        
        extensionIframe.style.position = 'absolute';
        extensionIframe.style.bottom = '55px';
        extensionIframe.style.right = '15px';
        extensionIframe.style.width = '460px';
        extensionIframe.style.height = '450px';
        extensionIframe.style.border = '2px solid var(--border-color, #212121)';
        extensionIframe.style.zIndex = '999999';
        extensionIframe.style.display = 'none';
        
        const player = document.querySelector('.html5-video-player');
        if (player)
        {
            player.appendChild(extensionIframe);
        }
    }
    
    if (extensionIframe.style.display === 'none')
    {
        extensionIframe.style.display = 'block';
    }
    else
    {
        extensionIframe.style.display = 'none';
    }
}

const domObserver = new MutationObserver(() =>
{
    injectYouTubeButton();
});
domObserver.observe(document.body, { childList: true, subtree: true });