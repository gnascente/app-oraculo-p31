export const config = {
    api: { bodyParser: false }, 
};

export default async function handler(req, res) {
    const token = "vercel_blob_rw_lSwvXX6stWnRHpgK_Txuyw1Wkl2opkBzxnWf1mGFW01IJZc";
    
    try {
        if (req.method === 'GET') {
            const prefix = req.query.prefix || ''; 
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
            const filename = req.query.filename;
            
            // Ler o stream em blocos (chunks) para a memória e formar o ficheiro completo
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
                method: 'PUT',
                headers: { 
                    authorization: `Bearer ${token}`,
                    'x-add-random-suffix': 'false' // Força a sobrescrita do ficheiro exato, evitando lixo
                },
                body: buffer
            });
            
            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: errText });
            }
            
            return res.status(200).json(await response.json());
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
