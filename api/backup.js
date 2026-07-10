export default async function handler(req, res) {
    const token = "vercel_blob_rw_lSwvXX6stWnRHpgK_Txuyw1Wkl2opkBzxnWf1mGFW01IJZc";
    
    try {
        // LISTAR BACKUPS
        if (req.method === 'GET') {
            const prefix = req.query.prefix || ''; 
            const response = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                headers: { authorization: `Bearer ${token}` }
            });
            return res.status(response.status).json(await response.json());
        }

        // DELETAR ÚNICO
        if (req.method === 'DELETE') {
            const url = req.query.url;
            const response = await fetch('https://blob.vercel-storage.com/delete', {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: [url] })
            });
            return res.status(response.status).json({});
        }

        // COMANDOS DE FAXINA (CLEANUP)
        if (req.method === 'POST') {
            if (req.body && req.body.action === 'cleanup') {
                const listRes = await fetch(`https://blob.vercel-storage.com/?prefix=${req.body.prefix}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const listData = await listRes.json();
                
                // Filtra tudo que for antigo/lixo e mantém apenas o novo URL
                const urlsToDelete = listData.blobs
                    .filter(b => b.url !== req.body.keepUrl)
                    .map(b => b.url);

                if (urlsToDelete.length > 0) {
                    await fetch('https://blob.vercel-storage.com/delete', {
                        method: 'POST',
                        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ urls: urlsToDelete })
                    });
                }
                return res.status(200).json({ deleted: urlsToDelete.length });
            }
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}
