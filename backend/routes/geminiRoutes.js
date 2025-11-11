const express = require('express');
const router = express.Router();

async function callGeminiAPI(prompt) {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
        throw new Error('GEMINI_API_KEY tanımlanmamış');
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Bilinmeyen hata');
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                return candidate.content.parts[0].text;
            }
        }

        throw new Error('Gemini yanıt veremedi');
    } catch (error) {
        console.error('Gemini API hatası:', error);
        throw error;
    }
}

router.post('/', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Geçersiz prompt' });
        }

        const response = await callGeminiAPI(prompt);
        res.json({ response });
    } catch (error) {
        console.error('Gemini route hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
