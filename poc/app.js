// --- POC App Logic ---

// 1. Initialize Dexie Database
const db = new Dexie('PocSyncDB');
db.version(1).stores({
    blocks: 'id, updatedAt, syncStatus'
});

// UI Elements
const viewMain = document.getElementById('mainView');
const viewTerminal = document.getElementById('terminalView');
const btnToggleTerminal = document.getElementById('btnToggleTerminal');
const btnCloseTerminal = document.getElementById('btnCloseTerminal');
const terminalOutput = document.getElementById('terminalOutput');
const blocksListEl = document.getElementById('blocksList');
const textInput = document.getElementById('newBlockText');
const mediaInput = document.getElementById('newBlockMedia');
const btnSave = document.getElementById('btnSaveBlock');
const previewContainer = document.getElementById('mediaPreviewContainer');

let currentMedia = [];

// Navigation
btnToggleTerminal.onclick = () => {
    viewMain.classList.remove('active');
    viewTerminal.classList.add('active');
};
btnCloseTerminal.onclick = () => {
    viewTerminal.classList.remove('active');
    viewMain.classList.add('active');
};

// Terminal Logger
const logTerminal = (msg, status = null) => {
    const div = document.createElement('div');
    let time = new Date().toLocaleTimeString();
    let statusHtml = '';

    if (status === 'ok') statusHtml = `<span class="status-ok">[OK]</span>`;
    else if (status === 'fail') statusHtml = `<span class="status-fail">[FAIL]</span>`;
    else if (status === 'warn') statusHtml = `<span class="status-warn">[WARN]</span>`;

    div.innerHTML = `[${time}] ${msg} ${statusHtml}`;
    terminalOutput.appendChild(div);
    viewTerminal.scrollTop = viewTerminal.scrollHeight;
};

// Formatting
const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// UI Rendering
const renderBlocks = async () => {
    const blocks = await db.blocks.toArray();
    blocksListEl.innerHTML = '';

    if (blocks.length === 0) {
        blocksListEl.innerHTML = '<div style="text-align:center; color: #888; padding: 20px;">Nenhum bloco criado.</div>';
        return;
    }

    blocks.sort((a, b) => b.updatedAt - a.updatedAt).forEach(b => {
        if (b.isDeleted) return;

        let statusClass = b.syncStatus === 'synced' ? 'status-synced' : 'status-pending';
        let statusText = b.syncStatus === 'synced' ? 'Sincronizado' : (b.syncStatus === 'uploading' ? `A enviar...` : 'Pendente');
        let cardClass = b.syncStatus;

        let conflictHtml = b.text.includes('[Conflito]') ? `<span class="block-conflict-marker">[Conflito]</span>` : '';
        let textHtml = b.text.replace('[Conflito]', '');

        let mediaHtml = '';
        if (b.media && b.media.length > 0) {
            mediaHtml = '<div class="block-media">';
            b.media.forEach(m => {
                if(m.data && m.data.startsWith('data:application/pdf')) {
                    mediaHtml += `<div class="media-preview-pdf"><i class="material-icons">picture_as_pdf</i>PDF</div>`;
                } else if(m.data) {
                    mediaHtml += `<img src="${m.data}">`;
                } else if (m.url) {
                     if (m.url.toLowerCase().includes('.pdf')) {
                         mediaHtml += `<div class="media-preview-pdf"><i class="material-icons">picture_as_pdf</i>PDF</div>`;
                     } else {
                         mediaHtml += `<img src="${m.url}">`; // From cloud
                     }
                }
            });
            mediaHtml += '</div>';
        }

        blocksListEl.innerHTML += `
            <div class="block-item ${cardClass}">
                <div class="block-header">
                    <span>ID: ${b.id.substring(0,8)}...</span>
                    <span>Modificado: ${formatDate(b.updatedAt)}</span>
                </div>
                <div class="block-text">${conflictHtml}${textHtml}</div>
                ${mediaHtml}
                <div class="block-footer">
                    <span class="block-status ${statusClass}">${statusText}</span>
                    <button class="icon-btn" onclick="deleteBlock('${b.id}')"><i class="material-icons">delete</i></button>
                </div>
            </div>
        `;
    });
};

// Media Compression Logic (from index.html rules)
const compressVideo = async (file) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.style.display = 'none';
        document.body.appendChild(video);

        video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            const MAX = 480;
            let w = video.videoWidth, h = video.videoHeight;
            if (w > MAX) { h = Math.floor(h * (MAX / w)); w = MAX; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');

            const stream = canvas.captureStream(10); // low fps for smaller size
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 600000 });
            const chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                document.body.removeChild(video);
                const blob = new Blob(chunks, { type: 'video/webm' });
                const reader = new FileReader();
                reader.onloadend = () => resolve({ data: reader.result });
                reader.readAsDataURL(blob);
            };

            recorder.start();
            video.play();
            const draw = () => {
                if (video.paused || video.ended) { recorder.stop(); return; }
                ctx.drawImage(video, 0, 0, w, h);
                requestAnimationFrame(draw);
            };
            draw();
        };
        video.onerror = () => { document.body.removeChild(video); reject("Erro ao carregar vídeo"); };
        video.src = URL.createObjectURL(file);
    });
};

const compressImage = async (file) => {
    return new Promise((resolve) => {
        if (file.size <= 250 * 1024) { // Under 250kb, keep as is
            const reader = new FileReader();
            reader.onload = (e) => resolve({ data: e.target.result });
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 800;
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve({ data: canvas.toDataURL('image/jpeg', 0.6) });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
};

const compressPdf = async (file) => {
    return new Promise((resolve) => {
        const encodedName = encodeURIComponent(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            let base64 = e.target.result.replace('data:application/pdf;base64,', `data:application/pdf;name=${encodedName};base64,`);
            resolve({ data: base64 });
        };
        reader.readAsDataURL(file);
    });
};

// Media handling (Preview)
mediaInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if(files.length === 0) return;

    btnSave.disabled = true;
    btnSave.innerText = "A processar mídia...";

    for (let f of files) {
        let processed = null;
        try {
            if (f.type.startsWith('video/')) {
                logTerminal(`Comprimindo vídeo: ${f.name}...`);
                processed = await compressVideo(f);
            } else if (f.type.startsWith('image/')) {
                logTerminal(`Comprimindo imagem: ${f.name}...`);
                processed = await compressImage(f);
            } else if (f.type === 'application/pdf') {
                logTerminal(`Preparando PDF: ${f.name}...`);
                processed = await compressPdf(f);
            }
        } catch (err) {
            logTerminal(`Erro ao processar ${f.name}: ${err}`, 'fail');
        }

        if (processed) {
            currentMedia.push({
                fileType: f.type,
                data: processed.data,
                fileName: f.name
            });
            updatePreview();
            logTerminal(`Mídia anexada: ${f.name}`, 'ok');
        }
    }

    btnSave.disabled = false;
    btnSave.innerText = "Salvar Bloco";
    e.target.value = '';
});

const updatePreview = () => {
    previewContainer.innerHTML = currentMedia.map((m, idx) => {
        if(m.fileType.includes('pdf')) return `<div class="media-preview-pdf" onclick="removeMedia(${idx})"><i class="material-icons">picture_as_pdf</i></div>`;
        return `<img src="${m.data}" class="media-preview" onclick="removeMedia(${idx})">`;
    }).join('');
};

window.removeMedia = (idx) => {
    currentMedia.splice(idx, 1);
    updatePreview();
};

// Create / Save Block
btnSave.onclick = async () => {
    const text = textInput.value.trim();
    if (!text && currentMedia.length === 0) return;

    const now = Date.now();
    const newBlock = {
        id: now.toString(),
        text: text,
        media: [...currentMedia],
        version: 1,
        isDeleted: false,
        syncStatus: 'pending', // Will trigger sync loop later
        uploadedChunks: 0,
        createdAt: now,
        updatedAt: now
    };

    await db.blocks.put(newBlock);

    // Reset form
    textInput.value = '';
    currentMedia = [];
    updatePreview();

    logTerminal(`Bloco criado (ID: ${newBlock.id})`, 'ok');
    await renderBlocks();
};

// Delete block
window.deleteBlock = async (id) => {
    const block = await db.blocks.get(id);
    if(block) {
        block.isDeleted = true;
        block.updatedAt = Date.now();
        block.syncStatus = 'pending';
        block.uploadedChunks = 0;
        await db.blocks.put(block);
        logTerminal(`Bloco marcado para exclusão (ID: ${id})`);
        await renderBlocks();
    }
};

// --- Sync Mechanism (Frontend) ---
let isSyncing = false;
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB for chunks

const getDeviceId = () => {
    let id = localStorage.getItem('poc_device_id');
    if (!id) {
        id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('poc_device_id', id);
    }
    return id;
};

const runSyncCycle = async () => {
    if (isSyncing || !navigator.onLine) return;

    // Check if there's anything pending
    const pendingBlocks = await db.blocks.where('syncStatus').equals('pending').toArray();
    if (pendingBlocks.length === 0) return; // Nothing to sync

    isSyncing = true;
    const deviceId = getDeviceId();

    for (let block of pendingBlocks) {
        logTerminal(`Iniciando sync do bloco ${block.id.substring(0,8)}...`);

        try {
            // 1. Prepare Payload
            const payload = {
                id: block.id,
                text: block.text,
                media: block.media,
                version: block.version,
                isDeleted: block.isDeleted,
                updatedAt: block.updatedAt,
                deviceId: deviceId
            };

            const payloadStr = JSON.stringify(payload);
            const totalSize = payloadStr.length;
            const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

            logTerminal(`Tamanho: ${(totalSize/1024).toFixed(2)}KB, Chunks: ${totalChunks}`);

            // 2. Upload Chunks Resumable Loop
            let chunkIdx = block.uploadedChunks || 0;
            let sessionId = `sync_${block.id}_v${block.version}`;

            while (chunkIdx < totalChunks) {
                // Slice payload string
                let start = chunkIdx * CHUNK_SIZE;
                let end = start + CHUNK_SIZE;
                let chunkDataStr = payloadStr.substring(start, end);

                logTerminal(`Enviando chunk ${chunkIdx + 1}/${totalChunks}...`);

                // Update UI state
                block.syncStatus = 'uploading';
                await db.blocks.put(block);
                renderBlocks(); // Re-render to show uploading state

                const res = await fetch(`/api/poc-sync?action=uploadChunk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        chunkIndex: chunkIdx,
                        totalChunks: totalChunks,
                        data: chunkDataStr,
                        blockId: block.id
                    })
                });

                if (!res.ok) {
                    const errObj = await res.json().catch(() => ({error: 'Unknown HTTP Error'}));

                    if (errObj.error === 'SESSION_EXPIRED') {
                        logTerminal(`Sessão expirada para o bloco ${block.id.substring(0,8)}. Reiniciando...`, 'warn');
                        // Reset chunk counter to start over next cycle
                        block.uploadedChunks = 0;
                        block.syncStatus = 'pending';
                        await db.blocks.put(block);
                        throw new Error('SESSION_EXPIRED');
                    }
                    throw new Error(errObj.error || `HTTP ${res.status}`);
                }

                const resData = await res.json();

                // If this was the last chunk, it will process the block and return the updated master state
                if (resData.status === 'completed') {
                     logTerminal(`Bloco ${block.id.substring(0,8)} concluído com sucesso.`, 'ok');

                     // We received the consolidated server state for this block (or potentially bifurcation)
                     const masterBlocks = resData.masterBlocks;

                     // Sync our local DB with what the server says
                     for (const mBlock of masterBlocks) {
                         // Update local db
                         mBlock.syncStatus = 'synced';
                         mBlock.uploadedChunks = 0;
                         await db.blocks.put(mBlock);
                     }

                     break; // Break the chunk loop
                } else {
                     // Chunk accepted, move to next
                     chunkIdx++;
                     block.uploadedChunks = chunkIdx;
                     await db.blocks.put(block);
                }
            }

        } catch (err) {
            if (err.message !== 'SESSION_EXPIRED') {
                logTerminal(`Falha no sync do bloco ${block.id.substring(0,8)}: ${err.message}`, 'fail');
            }
        }
    }

    isSyncing = false;
    await renderBlocks();
};

// Polling loop
setInterval(runSyncCycle, 5000);

// Init
const init = async () => {
    logTerminal('POC Application Started.', 'ok');
    await renderBlocks();
};

init();
