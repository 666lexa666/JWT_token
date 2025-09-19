import fetch from "node-fetch";
import { MongoClient } from "mongodb";

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "mydb";
const LOGIN = process.env.LOGIN;
const PASSWORD = process.env.PASSWORD;

async function main() {
  try {
    // 1. Авторизация
    const authRes = await fetch("https://identity.authpoint.pro/api/v1/public/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
    });

    if (!authRes.ok) throw new Error(`Auth failed: ${authRes.status}`);
    const authData = await authRes.json();

    if (!authData.accessToken) throw new Error("Ошибка авторизации: нет accessToken");

    const newToken = authData.accessToken;

    // 2. Подключение к MongoDB
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    const tokens = db.collection("tokens");

    // 3. Проверка текущего токена
    const current = await tokens.findOne({ name: "authToken" });

    if (!current || current.value !== newToken) {
      await tokens.updateOne(
        { name: "authToken" },
        { $set: { value: newToken, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log("✅ Token обновлён");
    } else {
      console.log("ℹ️ Token не изменился");
    }

    await client.close();
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
  }
}

main();
