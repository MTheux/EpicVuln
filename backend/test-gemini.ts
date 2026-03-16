
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  try {
    // Note: The SDK might not have a direct listModels in some versions, but we can try to find it or test a known model
    console.log("Testando gemini-1.5-pro...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("Oi");
    console.log("Sucesso com gemini-1.5-pro!");
  } catch (e: any) {
    console.error("Erro ao testar gemini-1.5-pro:", e.message);
  }
}

listModels();
