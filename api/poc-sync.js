import { put, list, del } from '@vercel/blob';

// Upstash Redis setup
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const MAIN_HASH_KEY = 'poc_sync_blocks';
const SESSION_TTL = 86400; // 24 hours in seconds

// Helper to make KV REST requests
async function kvRequest(command, ...args) {
    const res = await fetch(`${KV_REST_API_URL}/${command}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(args)
    });
    if (!res.ok) throw new Error(`KV Error: ${await res.text()}`);
    const data = await res.json();
    return data.result;
}

// Convert base64 to Buffer/Blob suitable for Vercel Blob
function base64ToBuffer(base64Str) {
    const matches = base64Str.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        // Assume it might be PDF with custom name format
        const pdfMatches = base64Str.match(/^data:application\/pdf;name=([^;]+);base64,(.+)$/);
        if (pdfMatches && pdfMatches.length === 3) {
             return { type: 'application/pdf', buffer: Buffer.from(pdfMatches[2], 'base64'), name: decodeURIComponent(pdfMatches[1]) };
        }
        throw new Error('Invalid base64 string');
    }
    return { type: matches[1], buffer: Buffer.from(matches[2], 'base64') };
}

async function logErrorToBlob(err) {
    try {
        let existingContent = '';
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        let blobUrl = null;

        if (token) {
            const match = token.match(/^vercel_blob_rw_([^_]+)_/);
            if (match) {
                const storeId = match[1].toLowerCase();
                blobUrl = `https://${storeId}.public.blob.vercel-storage.com/logpocerror.txt`;
            }
        }

        let fetchSuccess = false;
        if (blobUrl) {
            try {
                const res = await fetch(`${blobUrl}?ts=${Date.now()}`);
                if (res.ok) {
                    existingContent = await res.text();
                    fetchSuccess = true;
                }
            } catch (e) {
                console.error("Failed to fetch log directly", e);
            }
        }

        if (!fetchSuccess) {
            try {
                const listResult = await list({ prefix: 'logpocerror.txt' });
                const blob = listResult.blobs.find(b => b.pathname === 'logpocerror.txt');
                if (blob) {
                    const res = await fetch(`${blob.url}?ts=${Date.now()}`);
                    if (res.ok) {
                        existingContent = await res.text();
                    }
                }
            } catch (e) {
                console.error("Failed to list/fetch log", e);
            }
        }

        const newLogEntry = `\n--- [${new Date().toISOString()}] ---\nError: ${err.message || err}\nStack: ${err.stack || 'No stack trace'}\n`;
        const newContent = existingContent + newLogEntry;

        await put('logpocerror.txt', newContent, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'text/plain'
        });
    } catch (e) {
        console.error("Critical failure in logErrorToBlob", e);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = req.query;

    if (action === 'writeLog') {
        try {
            const { message, context, timestamp } = req.body;

            const logEntry = "\n[" + (timestamp || new Date().toISOString()) + "] " + message + "\n" +
                             (context ? JSON.stringify(context, null, 2) + "\n" : "") +
                             "----------------------------------------\n";

            // Try to append to existing log if it exists, otherwise create new
            // Note: Vercel Blob doesn't have an 'append' operation, so we read, concat, and put.
            let existingLog = '';
            try {
                const listRes = await list({ prefix: 'poc_sync/log.txt' });
                if (listRes.blobs.length > 0) {
                    const blobRes = await fetch(listRes.blobs[0].url + '?ts=' + Date.now());
                    existingLog = await blobRes.text();
                }
            } catch(e) {
                console.error("Failed to read existing log for append:", e);
            }

            const newLogContent = existingLog + logEntry;

            await put('poc_sync/log.txt', newLogContent, {
                access: 'public',
                contentType: 'text/plain',
                addRandomSuffix: false // Overwrite existing
            });

            return res.status(200).json({ status: 'logged' });
        } catch (err) {
            console.error('Failed to write log:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    if (action === 'wipeAll') {
        try {
            // 1. Delete all blocks in Redis
            await kvRequest('DEL', MAIN_HASH_KEY);

            // 2. Delete all blobs related to POC
            let hasMore = true;
            let cursor;
            while (hasMore) {
                const listResult = await list({
                    prefix: 'poc_sync/',
                    cursor,
                });

                if (listResult.blobs.length > 0) {
                    await del(listResult.blobs.map((blob) => blob.url));
                }

                hasMore = listResult.hasMore;
                cursor = listResult.cursor;
            }

            return res.status(200).json({ status: 'wiped' });
        } catch (err) {
            console.error('Wipe failed:', err);
            await logErrorToBlob(err).catch(e => console.error('Failed to log to blob', e));
            return res.status(500).json({ error: err.message });
        }
    }

    if (action === 'uploadChunk') {
        try {
            const { sessionId, chunkIndex, totalChunks, data, blockId } = req.body;

            // Validation: Ensure sequential upload
            if (chunkIndex > 0) {
                // Check if previous chunk exists. If not, the session might have expired.
                const prevChunkExists = await kvRequest('EXISTS', `${sessionId}:chunk:${chunkIndex - 1}`);
                if (!prevChunkExists) {
                    return res.status(400).json({ error: 'SESSION_EXPIRED' });
                }
            }

            // Save chunk to staging area (Redis) with TTL
            await kvRequest('SET', `${sessionId}:chunk:${chunkIndex}`, data, 'EX', SESSION_TTL);

            // Is it the last chunk?
            if (chunkIndex === totalChunks - 1) {
                // 1. Assemble chunks
                let assembledStr = '';
                for (let i = 0; i < totalChunks; i++) {
                    const chunkData = await kvRequest('GET', `${sessionId}:chunk:${i}`);
                    if (!chunkData) {
                        return res.status(400).json({ error: 'SESSION_EXPIRED' }); // Lost a chunk somehow
                    }
                    assembledStr += (typeof chunkData === 'string' ? chunkData : JSON.stringify(chunkData));
                }

                const payload = JSON.parse(assembledStr);

                // 2. Process Media (Upload to Vercel Blob to save DB space)
                if (payload.media && payload.media.length > 0) {
                    for (let i = 0; i < payload.media.length; i++) {
                        let m = payload.media[i];
                        if (m.data && !m.url) { // Needs upload
                            const { type, buffer, name } = base64ToBuffer(m.data);
                            let ext = type.split('/')[1] || 'bin';
                            if(type === 'image/jpeg') ext = 'jpg';

                            let filename = name ? name : `media_${payload.id}_${i}.${ext}`;

                            // Upload to blob
                            const blobResult = await put(`poc_sync/${filename}`, buffer, {
                                access: 'public',
                                contentType: type,
                            });

                            // Replace base64 data with url
                            m.url = blobResult.url;
                            delete m.data;
                        }
                    }
                }

                // 3. Conflict Resolution & Save (Option B: Bifurcation)
                const currentServerBlockRaw = await kvRequest('HGET', MAIN_HASH_KEY, payload.id);

                let finalBlocksToReturn = [];

                if (payload.isDeleted) {
                     // Deletions always win
                     await kvRequest('HSET', MAIN_HASH_KEY, payload.id, JSON.stringify(payload));
                } else if (currentServerBlockRaw) {
                    const currentServerBlock = typeof currentServerBlockRaw === 'string' ? JSON.parse(currentServerBlockRaw) : currentServerBlockRaw;

                    if (currentServerBlock.version > payload.version && !currentServerBlock.isDeleted) {
                        // Conflict! Cloud has a newer version. Bifurcate.
                        const newId = Date.now().toString(); // New unique ID
                        payload.id = newId;
                        payload.text = "[Conflito] " + payload.text;
                        payload.version = 1;
                        await kvRequest('HSET', MAIN_HASH_KEY, payload.id, JSON.stringify(payload));
                    } else {
                        // Safe to update
                        payload.version = (payload.version || 1) + 1;
                        await kvRequest('HSET', MAIN_HASH_KEY, payload.id, JSON.stringify(payload));
                    }
                } else {
                    // New block
                    payload.version = 1;
                    await kvRequest('HSET', MAIN_HASH_KEY, payload.id, JSON.stringify(payload));
                }

                // Clean up staging chunks
                for (let i = 0; i < totalChunks; i++) {
                     await kvRequest('DEL', `${sessionId}:chunk:${i}`);
                }

                // Return all current master blocks to client for reconciliation
                const allBlocksArrayStr = await kvRequest('HVALS', MAIN_HASH_KEY);
                const masterBlocks = allBlocksArrayStr.map(s => typeof s === 'string' ? JSON.parse(s) : s);

                return res.status(200).json({ status: 'completed', masterBlocks: masterBlocks });

            } else {
                // Chunk accepted, but not finished yet
                return res.status(200).json({ status: 'chunk_accepted' });
            }

        } catch (err) {
            console.error('Verbose uploadChunk error:', err);
            try {
               const logEntry = "\n[" + new Date().toISOString() + "] SERVER ERROR in uploadChunk: " + err.message + "\nStack: " + err.stack + "\n----------------------------------------\n";
               const listRes = await list({ prefix: 'poc_sync/log.txt' });
               let existingLog = '';
               if (listRes.blobs.length > 0) {
                   existingLog = await (await fetch(listRes.blobs[0].url + '?ts=' + Date.now())).text();
               }
               await put('poc_sync/log.txt', existingLog + logEntry, { access: 'public', contentType: 'text/plain', addRandomSuffix: false });
            } catch(e) { console.error('Failed to write server error log', e); }
            return res.status(500).json({ error: err.message, verbose: err.stack });
        }
    }

    return res.status(400).json({ error: 'Invalid action' });
}
