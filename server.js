import fetch from "node-fetch";
import { MongoClient } from "mongodb";
import HttpsProxyAgent from "https-proxy-agent";

// Переменные окружения
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "mydb";
const LOGIN = process.env.LOGIN;         
const PASSWORD = process.env.PASSWORD;   

// Данные прокси
const PROXY_URL = "http://user315490:wj74b1@193.201.10.104:4404";
const agent = new HttpsProxyAgent(PROXY_URL);

async function main() {
  try {
    // 1. Авторизация через прокси
    const authRes = await fetch("https://identity.authpoint.pro/api/v1/public/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
      agent,
    });

    if (!authRes.ok) throw new Error(`Auth failed: ${authRes.status}`);
    const authData = await authRes.json();
    if (!authData.accessToken) throw new Error("Ошибка авторизации: нет accessToken");

    const newToken = authData.accessToken;
    console.log("✅ Токен получен через прокси");

    // 2. Подключение к MongoDB
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    const tokens = db.collection("tokens");

    // 3. Сравнение токена и обновление
    const current = await tokens.findOne({ name: "authToken" });

    if (!current || current.value !== newToken) {
      await tokens.updateOne(
        { name: "authToken" },
        { $set: { value: newToken, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log("✅ Token обновлён в MongoDB");
    } else {
      console.log("ℹ️ Token не изменился");
    }

    await client.close();
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
  }
}

// Запуск
main();
