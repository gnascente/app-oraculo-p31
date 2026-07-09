export const config = {
    api: { bodyParser: false }, 
};

export default async function handler(req, res) {
    const token = "vercel_blob_rw_lSwvXX6stWnRHpgK_Txuyw1Wkl2opkBzxnWf1mGFW01IJZc";
    
    try {
        // LISTAR BACKUPS OU ARQUIVO MASTER
        if (req.method === 'GET') {
            const prefix = req.query.prefix || ''; 
            const response = await fetch(`https://blob.vercel-storage.com/?prefix=${prefix}`, {
                headers: { authorization: `Bearer ${token}` }
            });
            return res.status(response.status).json(await response.json());
        }

        // DELETAR
        if (req.method === 'DELETE') {
            const url = req.query.url;
            const response = await fetch('https://blob.vercel-storage.com/delete', {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: [url] })
            });
            return res.status(response.status).json({});
        }

        // SALVAR NOVO BACKUP / SOBRESCREVER MASTER DA SYNC
        if (req.method === 'POST') {
            const filename = req.query.filename;
            const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
                method: 'PUT',
                headers: { 
                    authorization: `Bearer ${token}`,
                    'x-add-random-suffix': 'false' // A mágica: Força a sobrescrita, zero lixo!
                },
                body: req,
                duplex: 'half' 
            });
            return res.status(response.status).json(await response.json());
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
