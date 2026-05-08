require('dotenv').config();

async function listAvailableModels() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
        console.error('❌ GOOGLE_GEMINI_API_KEY not configured in .env');
        process.exit(1);
    }

    console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...\n');
    
    // List models using v1 API
    try {
        console.log('📋 Fetching available models from v1 API...\n');
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok && data.models) {
            console.log(`✅ Found ${data.models.length} models:\n`);
            data.models.forEach(model => {
                const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
                const icon = supportsGenerate ? '✅' : '❌';
                console.log(`${icon} ${model.name}`);
                if (supportsGenerate) {
                    console.log(`   Display Name: ${model.displayName}`);
                    console.log(`   Description: ${model.description?.substring(0, 80)}...`);
                }
            });
        } else {
            console.log('❌ Error:', data.error?.message || JSON.stringify(data));
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

listAvailableModels().catch(console.error);
