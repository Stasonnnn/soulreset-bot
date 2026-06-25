require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const axios = require("axios");

const token = process.env.BOT_TOKEN;
const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN;
const API_URL = "https://soulreset.ru/api/add_paid_user.php?key=my_secret_key_2324";
const TELEGRAM_AUTH_WEBHOOK_URL = process.env.TELEGRAM_AUTH_WEBHOOK_URL || "https://soulreset.ru/api/telegram/webhook";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const ADMIN_ID = 970696381;

const PRICES = [
  {
    label: "Подписка на месяц",
    amount: 10000, // 1990 руб в копейках
  },
];

const bot = new TelegramBot(token, { polling: true });


// === /exportusers ===
bot.onText(/\/exportusers/, (msg) => {
  const chatId = msg.chat.id;

  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, "❌ У тебя нет доступа к этой команде.");
    return;
  }

  const filePath = "users.json";

  if (fs.existsSync(filePath)) {
    bot.sendDocument(chatId, filePath, {}, {
      filename: "users.json",
      contentType: "application/json"
    }).catch((err) => {
      console.error("❗ Ошибка отправки файла:", err.message);
      bot.sendMessage(chatId, "⚠️ Не удалось отправить файл.");
    });
  } else {
    bot.sendMessage(chatId, "📭 Файл users.json не найден.");
  }
});


// === /sendall ===
bot.onText(/\/sendall (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, "❌ У тебя нет доступа к этой команде.");
    return;
  }

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync("users.json"));
  } catch (err) {
    users = [];
  }

  users.forEach((id) => {
    bot.sendMessage(id, text).catch((err) => {
      console.error(`❗ Ошибка отправки ${id}: ${err.message}`);
    });
  });

  bot.sendMessage(chatId, "✅ Рассылка отправлена!");
});

// === Telegram site/app auth ===
bot.onText(/^\/start(?:@\w+)?\s+((?:login_(?:site|app|tg_game)_|auth_(?:a|w)_))([a-f0-9]{32})$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const payloadPrefix = String(match[1] || "").toLowerCase();
  const authToken = String(match[2] || "").toLowerCase();

  if (!TELEGRAM_WEBHOOK_SECRET) {
    console.error("TELEGRAM_WEBHOOK_SECRET is required for Telegram auth");
    bot.sendMessage(chatId, "Не удалось подтвердить вход. Попробуйте позже.");
    return;
  }

  try {
    const payloadText = payloadPrefix.startsWith("login_")
      ? `/start ${payloadPrefix}${authToken}`
      : payloadPrefix.startsWith("auth_")
        ? `/start ${payloadPrefix}${authToken}`
        : `/start login_site_${authToken}`;
    await axios.post(TELEGRAM_AUTH_WEBHOOK_URL, {
      update_id: Date.now(),
      message: {
        message_id: msg.message_id,
        from: msg.from,
        chat: msg.chat,
        date: msg.date,
        text: payloadText,
      },
    }, {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": TELEGRAM_WEBHOOK_SECRET,
      },
      timeout: 5000,
    });
  } catch (err) {
    console.error("Telegram auth confirm failed:", err.response?.data || err.message);
    bot.sendMessage(chatId, "Не удалось подтвердить вход. Вернитесь на сайт и попробуйте ещё раз.");
  }
});

// === /start ===
bot.onText(/^\/start(?:@\w+)?$/i, (msg) => {
  const chatId = msg.chat.id;

  // Добавление пользователя
  let users = [];
  try {
    users = JSON.parse(fs.readFileSync("users.json"));
  } catch {
    users = [];
  }

  if (!users.includes(chatId)) {
    users.push(chatId);
    fs.writeFileSync("users.json", JSON.stringify(users));
  }

  const imageUrl = "https://soulreset.ru/img/box_lila_tg.png";
  const webAppUrl = "https://soulreset.ru/play/choose.html?app=1";

  bot.sendPhoto(chatId, imageUrl, {
    caption: `🌟 Добро пожаловать в *SoulReset*!\n\nОткрой для себя путешествие через тело, сознание и свет.`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Войти через Telegram", web_app: { url: webAppUrl } }],
        [{ text: "🔥 ДЕМО доступ", callback_data: "demo_access" }],
        [{ text: "💳 Купить PREMIUM ", callback_data: "pay" }],
        [{ text: "ℹ️ Инфо о подписке", callback_data: "about_subscription" }],
        [{ text: "🚀 PREMIUM пакет", web_app: { url: webAppUrl } }],
        [
          { text: "📢 Мой канал", url: "https://t.me/drestas" },
          { text: "🌐 Официальный сайт", url: "https://soulreset.ru/main.html" },
        ],
      ],
    },
  });
});

// === Обработка callback_query ===
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;

  if (query.data === "pay") {
    bot.sendInvoice(
      chatId,
      "Подписка на SoulReset",
      "Доступ ко всем практикам и обновлениям на месяц.",
      "payload-subscription",
      PROVIDER_TOKEN,
      "RUB",
      PRICES,
      {
        photo_url: "https://soulreset.ru/img/cover_q.jpg",
        photo_width: 512,
        photo_height: 512,
        need_email: false,
        is_flexible: false,
      }
    );
  } else if (query.data === "about_subscription") {
    bot.sendMessage(chatId, `
📄 *Что входит в подписку SoulReset PREMIUM:*

— 🔓 Полный доступ ко всем 72 практикам  
— 🌀 Доступ к новинкам и регулярным обновлениям  
— 🎯 Терапевтические программы коучинга  
— 🎮 Режим Игры «Лила»  
— 🤝 Поддержка в Telegram-чате

💰 Стоимость: 1990 ₽  
⏳ Срок: 30 дней  
📌 Оплата через Telegram Pay

С офертой можно ознакомиться здесь:  
https://soulreset.ru/oferta.html
`, { parse_mode: "Markdown" });
  } else if (query.data === "demo_access") {
    bot.sendMessage(chatId, "Для демо доступа подпишитесь на канал @drestas:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Я подписался, проверить", callback_data: "check_subscription" }],
        ],
      },
    });
  } else if (query.data === "check_subscription") {
    try {
      const res = await bot.getChatMember("@drestas", userId);
      const status = res.status;

      if (["creator", "administrator", "member"].includes(status)) {
        await bot.deleteMessage(chatId, messageId);
          await bot.sendPhoto(chatId, "https://soulreset.ru/img/cover_q.jpg", {
            caption: "🎉 Подписка подтверждена! Вот твой доступ 👇",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Войти в демо", web_app: { url: "https://soulreset.ru/play/68.Cosmic_f.html" } }],
            ],
          },
        });
      } else {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Вы ещё не подписались на канал.",
          show_alert: true,
        });
      }
    } catch (err) {
      console.error(err.message);
      await bot.answerCallbackQuery(query.id, {
        text: "⚠️ Не удалось проверить подписку. Попробуйте позже.",
        show_alert: true,
      });
    }
  }
});

// === Подтверждение перед оплатой ===
bot.on("pre_checkout_query", (query) => {
  bot.answerPreCheckoutQuery(query.id, true);
});

// === После оплаты ===
bot.on("message", async (msg) => {
  if (msg.successful_payment) {
    const telegramId = msg.from.id;

    try {
      const res = await axios.post(API_URL, {
        telegram_id: telegramId,
      });

      if (res.data.status === "ok") {
        bot.sendMessage(
          msg.chat.id,
          "✅ Спасибо за оплату! Подписка активирована.",
        );
      } else {
        bot.sendMessage(
          msg.chat.id,
          "❗️ Оплата прошла, но ID не удалось сохранить.",
        );
      }
    } catch (err) {
      console.error(err.message);
      bot.sendMessage(
        msg.chat.id,
        "⚠️ Ошибка при сохранении подписки. Попробуйте позже.",
      );
    }
  }
});

// === Express-сервер для Replit/хостинга ===
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
