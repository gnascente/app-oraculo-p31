export const config = {
    api: { bodyParser: false }, 
};

export default async function handler(req, res) {
    const token = "vercel_blob_rw_lSwvXX6stWnRHpgK_Txuyw1Wkl2opkBzxnWf1mGFW01IJZc";
    
    // Helper to run delete requests
    const deleteBlobs = async (urls) => {
        if (!urls || urls.length === 0) return;
        try {
            await fetch('https://blob.vercel-storage.com/delete', {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: urls })
            });
        } catch (e) {
            console.error("Error deleting blobs", e);
        }
    };

    // Helper to get master blob url
    const getMasterBlobUrl = (listData, prefix) => {
        if(!listData || !listData.blobs) return null;
        const masterBlob = listData.blobs.find(b => b.pathname === `${prefix}_master.json`);
        if (masterBlob) return masterBlob.url;

        // Fallback for older format if no explicit master suffix is found
        const potentialMasters = listData.blobs.filter(b => !b.pathname.includes('_lock_') && !b.pathname.includes('_part_'));
        if (potentialMasters.length > 0) {
            potentialMasters.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            return potentialMasters[0].url;
        }
        return null;
    };

    const getPredictableMasterUrl = (prefix) => {
        const parts = token.split('_');
        if (parts.length >= 4) {
            const storeId = parts[3].toLowerCase();
            return `https://${storeId}.public.blob.vercel-storage.com/${prefix}_master.json`;
        }
        return null;
    };

    try {
        if (req.method === 'GET') {
            const prefix = req.query.prefix || ''; 
            const action = req.query.action;

            if (action === 'masterDate') {
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();
                let masterDate = null;
                if (listData && listData.blobs) {
                    const masterBlob = listData.blobs.find(b => b.pathname === `${prefix}_master.json`);
                    if (masterBlob) {
                        masterDate = masterBlob.uploadedAt;
                    } else {
                        const potentialMasters = listData.blobs.filter(b => !b.pathname.includes('_lock_') && !b.pathname.includes('_part_'));
                        if (potentialMasters.length > 0) {
                            potentialMasters.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                            masterDate = potentialMasters[0].uploadedAt;
                        }
                    }
                }
                return res.status(200).json({ uploadedAt: masterDate });
            }

            if (action === 'index') {
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();

                // Cleanup old locks and orphans in the background to ensure only master is kept
                if (listData.blobs && listData.blobs.length > 0) {
                    const now = Date.now();
                    const urlsToDelete = [];
                    listData.blobs.forEach(b => {
                        // Check if it's a lock file older than 30 mins (30 * 60 * 1000 = 1800000 ms)
                        if (b.pathname.includes('_lock_')) {
                            const uploadTime = new Date(b.uploadedAt).getTime();
                            if (now - uploadTime > 1800000) {
                                urlsToDelete.push(b.url);
                            }
                        }
                        // We do not aggressively delete parts here in case an active sync is running
                    });
                    if (urlsToDelete.length > 0) {
                        // Fire and forget
                        deleteBlobs(urlsToDelete);
                    }
                }

                let masterData = { entities: [], logs: [] };
                let predictableUrl = getPredictableMasterUrl(prefix);
                let fallbackUrl = getMasterBlobUrl(listData, prefix);
                let attempts = 0;
                let success = false;
                
                if (!predictableUrl && !fallbackUrl) {
                    success = true;
                }

                while (attempts < 5 && !success) {
                    let getRes = null;
                    if (predictableUrl) {
                        getRes = await fetch(predictableUrl + '?ts=' + Date.now(), { cache: 'no-store' });
                    }
                    if (!getRes || !getRes.ok) {
                        if (fallbackUrl) {
                            getRes = await fetch(fallbackUrl + '?ts=' + Date.now(), { cache: 'no-store' });
                        }
                    }

                    if (getRes && getRes.ok) {
                        try {
                            const text = await getRes.text();
                            masterData = JSON.parse(text);
                            success = true;
                        } catch (e) {
                            // Retry
                        }
                    } else if (getRes && getRes.status === 404) {
                        // Vercel blob could be eventually consistent, but if it's not in the list, it might really be a 404.
                        if (!fallbackUrl) {
                            success = true;
                        }
                    }

                    if (!success) {
                        attempts++;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (!success) {
                    return res.status(500).json({ error: "Falha ao ler master JSON (timeout)." });
                }

                const indexMap = {
                    entities: masterData.entities.map(e => ({ id: e.id, updatedAt: e.updatedAt || e.createdAt || 0 })),
                    logs: masterData.logs.map(l => ({ id: l.id, updatedAt: l.updatedAt || l.createdAt || 0 }))
                };

                return res.status(200).json(indexMap);
            }

            const response = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                headers: { authorization: `Bearer ${token}` }
            });
            return res.status(response.status).json(await response.json());
        }

        if (req.method === 'DELETE') {
            const url = req.query.url;
            await deleteBlobs([url]);
            return res.status(200).json({});
        }

        if (req.method === 'PUT') {
            const filename = req.query.filename;
            if (filename) {
                // Buffer the request properly for Node fetch
                const chunks = [];
                for await (const chunk of req) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);

                // Proxy the buffer to Vercel Blob
                const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
                    method: 'PUT',
                    headers: {
                        authorization: `Bearer ${token}`,
                        'x-add-random-suffix': 'false'
                    },
                    body: buffer
                });

                if (!response.ok) {
                    const errText = await response.text();
                    return res.status(response.status).json({ error: errText });
                }

                return res.status(200).json(await response.json());
            }
            return res.status(400).json({ error: 'Filename não especificado para PUT.' });
        }

        if (req.method === 'POST') {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            const bodyStr = buffer.toString('utf8');
            let bodyData;
            
            try {
                bodyData = JSON.parse(bodyStr);
            } catch(e) {
                bodyData = null;
            }

            const action = req.query.action || (bodyData && bodyData.action);

            // New startSync action
            if (action === 'startSync') {
                const { prefix, macAddress, authorName } = bodyData;

                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();

                // Check for active locks
                const activeLocks = listData.blobs ? listData.blobs.filter(b => b.pathname.includes(`${prefix}_lock_`)) : [];
                const now = Date.now();
                let canStart = true;
                let urlsToDelete = [];
                let conflictAuthor = null;

                for (const lock of activeLocks) {
                    const uploadTime = new Date(lock.uploadedAt).getTime();
                    // If lock is older than 30 mins, it's stale, we can delete it
                    if (now - uploadTime > 1800000) {
                        urlsToDelete.push(lock.url);
                    } else if (!lock.pathname.includes(`_lock_${macAddress}`)) {
                        // Someone else holds a fresh lock
                        canStart = false;
                        try {
                            const lockDataRes = await fetch(lock.url);
                            const lockData = await lockDataRes.json();
                            if (lockData.authorName) {
                                conflictAuthor = lockData.authorName;
                            }
                        } catch (err) {
                            console.error("Failed to fetch lock details", err);
                        }
                    } else {
                        // It's our own fresh lock, we can proceed, but let's delete the old one to refresh it
                        urlsToDelete.push(lock.url);
                    }
                }

                if (urlsToDelete.length > 0) await deleteBlobs(urlsToDelete);

                if (!canStart) {
                    return res.status(409).json({ error: "Aguarde! Sincronização já iniciada por " + (conflictAuthor || "outro dispositivo") + "." });
                }

                // Also clean up any old orphan parts for this prefix to be safe
                const orphanParts = listData.blobs ? listData.blobs.filter(b => b.pathname.includes(`${prefix}_part_`)) : [];
                if (orphanParts.length > 0) await deleteBlobs(orphanParts.map(p => p.url));

                // Create lock
                const lockName = `${prefix}_lock_${macAddress}.json`;
                const putRes = await fetch(`https://blob.vercel-storage.com/${lockName}`, {
                    method: 'PUT',
                    headers: {
                        authorization: `Bearer ${token}`,
                        'x-add-random-suffix': 'false'
                    },
                    body: JSON.stringify({ macAddress, timestamp: now, authorName })
                });

                if (!putRes.ok) return res.status(putRes.status).json({ error: "Failed to create lock" });
                return res.status(200).json({ success: true, message: "Sync started" });
            }

            // Fallback backward compatible syncFragment (just in case)
            if (action === 'syncFragment') {
                 // DEPRECATED - but keep logic if needed for older clients
                return res.status(400).json({ error: "Use chunked sync process (startSync -> uploadChunk -> finalizeSync)" });
            }

            if (action === 'uploadChunk') {
                const filename = req.query.filename;
                if (!filename) {
                    return res.status(400).json({ error: 'Filename não especificado.' });
                }
                const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
                    method: 'PUT',
                    headers: {
                        authorization: `Bearer ${token}`,
                        'x-add-random-suffix': 'false'
                    },
                    body: buffer
                });

                if (!response.ok) {
                    const errText = await response.text();
                    return res.status(response.status).json({ error: errText });
                }

                return res.status(200).json(await response.json());
            }

            if (action === 'finalizeSync') {
                const { prefix, macAddress, toDownloadIds, uploadedPartUrls } = bodyData;
                
                // Get all parts
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();

                let partUrls = [];
                if (uploadedPartUrls && uploadedPartUrls.length > 0) {
                    // SSRF Validation
                    partUrls = uploadedPartUrls.filter(url => typeof url === 'string' && url.startsWith('https://') && url.includes('.public.blob.vercel-storage.com'));
                } else {
                    // Fallback for older clients that don't send uploadedPartUrls
                    const parts = listData.blobs ? listData.blobs.filter(b => b.pathname.includes(`${prefix}_part_${macAddress}_`)) : [];
                    parts.sort((a, b) => {
                        const idxA = parseInt(a.pathname.split('_').pop().split('.')[0]);
                        const idxB = parseInt(b.pathname.split('_').pop().split('.')[0]);
                        return idxA - idxB;
                    });
                    partUrls = parts.map(p => p.url);
                }

                let toUpload = { entities: [], logs: [] };
                let parseError = false;

                // Download all parts in parallel to avoid Vercel Serverless Function timeout
                const partResults = await Promise.all(partUrls.map(async url => {
                    let attempts = 0;
                    while (attempts < 7) {
                        try {
                            const getRes = await fetch(url + '?ts=' + Date.now(), { cache: 'no-store' });
                            if (getRes.ok) {
                                const text = await getRes.text();
                                try {
                                    return JSON.parse(text);
                                } catch (e) {
                                    console.error(`Parse attempt ${attempts + 1} failed for ${url}`, e);
                                    // Treat parse failure as a fetch failure (e.g. CDN HTML error page) and retry
                                }
                            } else {
                                console.error(`Fetch attempt ${attempts + 1} returned status ${getRes.status} for ${url}`);
                            }
                        } catch (e) {
                            console.error(`Fetch attempt ${attempts + 1} failed for ${url}`, e);
                        }
                        attempts++;
                        await new Promise(r => setTimeout(r, 1500));
                    }
                    return null; // Failed after retries
                }));

                for (let i = 0; i < partResults.length; i++) {
                    const chunkData = partResults[i];
                    if (chunkData) {
                        if (chunkData.entities) {
                            toUpload.entities.push(...chunkData.entities);
                        }
                        if (chunkData.logs) {
                            toUpload.logs.push(...chunkData.logs);
                        }
                    } else {
                        console.error(`Failed to download or parse part url ${partUrls[i]} after retries.`);
                        parseError = true;
                        break;
                    }
                }

                if (parseError) {
                    // Delete parts and lock on failure to unblock
                    const toDelete = [...partUrls];
                    const lockFile = listData.blobs.find(b => b.pathname.includes(`${prefix}_lock_${macAddress}`));
                    if(lockFile) toDelete.push(lockFile.url);
                    await deleteBlobs(toDelete);
                    return res.status(500).json({ error: "Falha ao processar os dados combinados." });
                }

                // Fetch Master
                let masterData = { entities: [], logs: [] };
                let predictableUrl = getPredictableMasterUrl(prefix);
                let fallbackUrl = getMasterBlobUrl(listData, prefix);
                let masterBlobUrlToDelete = null;

                let attempts = 0;
                let success = false;

                if (!predictableUrl && !fallbackUrl) {
                    success = true;
                }

                while (attempts < 5 && !success) {
                    let getRes = null;
                    if (predictableUrl) {
                        getRes = await fetch(predictableUrl + '?ts=' + Date.now(), { cache: 'no-store' });
                        if (getRes.ok) masterBlobUrlToDelete = predictableUrl;
                    }
                    if (!getRes || !getRes.ok) {
                        if (fallbackUrl) {
                            getRes = await fetch(fallbackUrl + '?ts=' + Date.now(), { cache: 'no-store' });
                            if (getRes.ok) masterBlobUrlToDelete = fallbackUrl;
                        }
                    }

                    if (getRes && getRes.ok) {
                        try {
                            const text = await getRes.text();
                            masterData = JSON.parse(text);
                            success = true;
                        } catch (e) {
                            // Retry
                        }
                    } else if (getRes && getRes.status === 404) {
                        if (!fallbackUrl) {
                            success = true;
                        }
                    }

                    if (!success) {
                        attempts++;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (!success) {
                    const toDelete = [...partUrls];
                    const lockFile = listData.blobs.find(b => b.pathname.includes(`${prefix}_lock_${macAddress}`));
                    if(lockFile) toDelete.push(lockFile.url);
                    await deleteBlobs(toDelete);
                    return res.status(500).json({ error: "Falha ao ler master JSON (timeout)." });
                }

                // Compute diffs to download before merging
                const toDownload = {
                    entities: masterData.entities.filter(e => toDownloadIds.entities.includes(e.id)),
                    logs: masterData.logs.filter(l => toDownloadIds.logs.includes(l.id))
                };

                const mergeIntoMaster = (masterArr, uploadArr) => {
                    const map = new Map();
                    masterArr.forEach(item => map.set(item.id, item));
                    uploadArr.forEach(item => {
                        const existing = map.get(item.id);
                        if (!existing) {
                            map.set(item.id, item);
                        } else {
                            const lTime = item.updatedAt || item.createdAt || 0;
                            const rTime = existing.updatedAt || existing.createdAt || 0;
                            if (lTime > rTime) {
                                map.set(item.id, item);
                            }
                        }
                    });
                    return Array.from(map.values());
                };

                masterData.entities = mergeIntoMaster(masterData.entities, toUpload.entities || []);
                masterData.logs = mergeIntoMaster(masterData.logs, toUpload.logs || []);

                // Save new master
                const mergedJSON = JSON.stringify(masterData);
                const putRes = await fetch(`https://blob.vercel-storage.com/${prefix}_master.json`, {
                    method: 'PUT',
                    headers: { 
                        authorization: `Bearer ${token}`,
                        'x-add-random-suffix': 'false' 
                    },
                    body: mergedJSON
                });

                if (!putRes.ok) {
                    return res.status(putRes.status).json({ error: await putRes.text() });
                }
                const putData = await putRes.json();
                const newMasterBlobUrl = putData.url;

                // Cleanup: Delete all parts, lock, and previous master (if it had a random suffix and was different)
                const urlsToDelete = [...partUrls];
                const lockFile = listData.blobs.find(b => b.pathname.includes(`${prefix}_lock_${macAddress}`));
                if(lockFile) urlsToDelete.push(lockFile.url);
                if (masterBlobUrlToDelete && masterBlobUrlToDelete !== newMasterBlobUrl) {
                    urlsToDelete.push(masterBlobUrlToDelete);
                }
                // Also delete other locks just in case
                const otherLocks = listData.blobs.filter(b => b.pathname.includes(`${prefix}_lock_`));
                otherLocks.forEach(l => { if(!urlsToDelete.includes(l.url)) urlsToDelete.push(l.url) });

                await deleteBlobs(urlsToDelete);

                // Include a simulated future uploadedAt to avoid sync feedback loop due to subtle delays/clock skew
                const finalResponse = { ...toDownload, uploadedAt: new Date(Date.now() + 10000).toISOString() };

                return res.status(200).json(finalResponse);
            }
            
            if (action === 'cleanup') {
                const { prefix, macAddress } = bodyData;

                // Get all parts to find lock
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();

                const lockFile = listData.blobs ? listData.blobs.find(b => b.pathname.includes(`${prefix}_lock_${macAddress}`)) : null;
                if (lockFile) {
                    await deleteBlobs([lockFile.url]);
                }
                return res.status(200).json({ success: true });
            }

            return res.status(400).json({ error: 'Ação não especificada.' });
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}