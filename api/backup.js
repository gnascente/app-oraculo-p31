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
            let buffer;
            
            // Tenta ler o stream do celular e montar na memória
            try {
                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(chunk);
                }
                buffer = Buffer.concat(chunks);
            } catch (readErr) {
                return res.status(400).json({ 
                    error: "Falha na conversão do Stream (Buffer) no Node.js", 
                    detalhe: readErr.message, 
                    stack: readErr.stack 
                });
            }

            // Tenta forçar o envio direto do buffer pro Vercel Blob
            try {
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
                    return res.status(response.status).json({ 
                        error: "API da Vercel Blob rejeitou o pacote", 
                        detalhe: errText 
                    });
                }
                
                return res.status(200).json(await response.json());
            } catch (fetchErr) {
                return res.status(502).json({ 
                    error: "Falha de rede interna no servidor", 
                    detalhe: fetchErr.message, 
                    stack: fetchErr.stack 
                });
            }
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        return res.status(500).json({ 
            error: "Erro Fatal no Handler Geral", 
            detalhe: error.message, 
            stack: error.stack 
        });
    }
}
