export const config = {
    api: { bodyParser: false }, 
};

export default async function handler(req, res) {
    const token = "vercel_blob_rw_lSwvXX6stWnRHpgK_Txuyw1Wkl2opkBzxnWf1mGFW01IJZc";
    
    try {
        if (req.method === 'GET') {
            const prefix = req.query.prefix || ''; 
            const action = req.query.action;

            if (action === 'index') {
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();
                let masterData = { entities: [], logs: [] };
                
                if(listData.blobs && listData.blobs.length > 0) {
                    listData.blobs.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                    const getRes = await fetch(listData.blobs[0].url, { cache: 'no-store' });
                    if(getRes.ok) masterData = await getRes.json();
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
            const response = await fetch('https://blob.vercel-storage.com/delete', {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: [url] })
            });
            return res.status(response.status).json({});
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

            if (action === 'syncFragment') {
                const { prefix, toUpload, toDownloadIds } = bodyData;
                
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();
                let masterData = { entities: [], logs: [] };
                
                if(listData.blobs && listData.blobs.length > 0) {
                    listData.blobs.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                    const getRes = await fetch(listData.blobs[0].url, { cache: 'no-store' });
                    if(getRes.ok) masterData = await getRes.json();
                }

                const toDownload = {
                    entities: masterData.entities.filter(e => toDownloadIds.entities.includes(e.id)),
                    logs: masterData.logs.filter(l => toDownloadIds.logs.includes(l.id))
                };

                const mergeIntoMaster = (masterArr, uploadArr) => {
                    const map = new Map();
                    masterArr.forEach(item => map.set(item.id, item));
                    uploadArr.forEach(item => map.set(item.id, item));
                    return Array.from(map.values());
                };

                masterData.entities = mergeIntoMaster(masterData.entities, toUpload.entities || []);
                masterData.logs = mergeIntoMaster(masterData.logs, toUpload.logs || []);

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
                    const errText = await putRes.text();
                    return res.status(putRes.status).json({ error: errText });
                }

                return res.status(200).json(toDownload);
            }
            
            if (action === 'cleanup') {
                return res.status(200).json({ success: true });
            }

            const filename = req.query.filename;
            if (filename) {
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

            return res.status(400).json({ error: 'Ação não especificada.' });
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
