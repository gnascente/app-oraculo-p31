export const config = {
    api: { bodyParser: false }, // Necessário para receber o arquivo binário corretamente no Node.js/Vercel
};

export default async function handler(req, res) {
    // Chaves injetadas conforme solicitado
    const storeId = "store_lSwvXX6stWnRHpgK";
    const token = "vercel_blob_rw_lSwvXX6stWnRHpgK_Txuyw1Wkl2opkBzxnWf1mGFW01IJZc";
    
    try {
        // LISTAR BACKUPS
        if (req.method === 'GET') {
            const response = await fetch('https://blob.vercel-storage.com/?prefix=backup_oraculo_', {
                headers: { authorization: `Bearer ${token}` }
            });
            return res.status(response.status).json(await response.json());
        }

        // DELETAR BACKUP
        if (req.method === 'DELETE') {
            const url = req.query.url;
            const response = await fetch('https://blob.vercel-storage.com/delete', {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: [url] })
            });
            return res.status(response.status).json({});
        }

        // SALVAR NOVO BACKUP
        if (req.method === 'POST') {
            const filename = req.query.filename;
            const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
                method: 'PUT',
                headers: { authorization: `Bearer ${token}` },
                body: req,
                duplex: 'half' // Exigido pelo Node.js para streaming binário via fetch
            });
            return res.status(response.status).json(await response.json());
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
