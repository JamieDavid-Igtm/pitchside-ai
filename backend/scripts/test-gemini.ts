import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in environment variables.');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Say "Gemini API is working!" in exactly those words.' }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    });

    const response = await result.response;
    const text = response.text();
    console.log('Gemini API test succeeded!');
    console.log('Response:', text);
    process.exit(0);
  } catch (error) {
    console.error('Gemini API test failed:', error);
    process.exit(1);
  }
}

testGemini();
