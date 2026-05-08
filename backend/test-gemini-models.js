require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
        console.error('❌ GOOGLE_GEMINI_API_KEY not configured in .env');
        process.exit(1);
    }

    console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names
    const modelsToTry = [
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'models/gemini-pro',
        'models/gemini-1.5-pro',
        'models/gemini-1.5-flash'
    ];

    console.log('\n🧪 Testing available models...\n');

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const text = result.response.text();
            console.log(`✅ ${modelName} - WORKS! Response: ${text.substring(0, 50)}...`);
            break; // Stop after first working model
        } catch (error) {
            console.log(`❌ ${modelName} - ${error.message.substring(0, 100)}`);
        }
    }
}

listModels().catch(console.error);
