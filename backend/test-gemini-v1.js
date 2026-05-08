require('dotenv').config();

async function testGeminiAPI() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
        console.error('❌ GOOGLE_GEMINI_API_KEY not configured in .env');
        process.exit(1);
    }

    console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');
    
    // Try direct REST API call with v1
    const modelsToTry = [
        'gemini-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest'
    ];

    for (const model of modelsToTry) {
        try {
            console.log(`\n🧪 Testing ${model} with v1 API...`);
            const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Hello, respond with just "OK"' }]
                    }]
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                console.log(`✅ ${model} WORKS with v1 API!`);
                console.log('Response:', JSON.stringify(data, null, 2));
                break;
            } else {
                console.log(`❌ ${model} failed:`, data.error?.message || JSON.stringify(data));
            }
        } catch (error) {
            console.log(`❌ ${model} error:`, error.message);
        }
    }
}

testGeminiAPI().catch(console.error);
