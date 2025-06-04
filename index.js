const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN;
const API_URL = "https://soulreset.ru/api/add_paid_user.php?key=my_secret_key_2324";

const PRICES = [
  {
    label: "Подписка на месяц",
    amount: 10000,
  },
];

const ADMIN_ID = 970696381; // ← сюда вставь СВОЙ Telegram ID

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
    console.error("Не удалось прочитать users.json:", err.message);
    bot.sendMessage(chatId, "⚠️ Ошибка чтения списка пользователей.");
    return;
  }

  users.forEach((id) => {
    bot.sendMessage(id, text).catch((err) => {
      console.error(`❗ Ошибка отправки ${id}: ${err.message}`);
    });
  });

  bot.sendMessage(chatId, "✅ Рассылка отправлена!");
});

// === /start ===
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // --- Добавление пользователя в users.json ---
  let users = [];
  try {
    users = JSON.parse(fs.readFileSync("users.json"));
  } catch (err) {
    users = [];
  }
  if (!users.includes(chatId)) {
    users.push(chatId);
    fs.writeFileSync("users.json", JSON.stringify(users));
  }
  // --- конец блока ---

  const imageUrl = "https://soulreset.ru/img/box_lila_maket1.jpg";
  const webAppUrl = "https://soulreset.ru/play/choose.html";

  bot.sendPhoto(chatId, imageUrl, {
    caption: `🌟 Добро пожаловать в *SoulReset*!\n\nОткрой для себя путешествие через тело, сознание и свет.`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Заходи в Игру", web_app: { url: webAppUrl } }],
        [{ text: "💳 PREMIYM за 1990 руб", callback_data: "pay" }],
        [{ text: "ℹ️ Инфо о подписке", callback_data: "about_subscription" }],
        [{ text: "🔥 ДЕМО доступ", callback_data: "demo_access" }],
        [
          { text: "📢 Мой канал", url: "https://t.me/drestas" },
          { text: "🌐 Официальный сайт", url: "https://soulreset.ru/main.html" },
        ],
      ],
    },
  });
});

// === ОДИН обработчик callback_query ===
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
        photo_url: "https://soulreset.ru/assets/icon512.png",
        photo_width: 512,
        photo_height: 512,
        need_email: false,
        is_flexible: false,
      }
    );
  } else if (query.data === "about_subscription") {
    bot.sendMessage(chatId, `
📄 Что входит в подписку SoulReset PREMIUM:

— 🔓 Полный доступ ко всем 72 практикам (аудио, видео, текст)
— 🌀 Доступ к новинкам и регулярным обновлениям
— 🎯 Терапевтические программы и авторский коучинг
— 🎮 Полноценный режим игры «Лила»
— 🤝 Поддержка и ответы на вопросы в Telegram-чате

💰 Стоимость: 1990 ₽ / месяц
⏳ Срок действия: 30 дней
📌 Оплата через Telegram Pay

🛎 Нажимая кнопку «Купить», вы соглашаетесь с офертой:
https://soulreset.ru/oferta.html

🗓 Дорожная карта (Roadmap) обновлений:

Июнь: запуск вкладки «Практика дня»
Июль: расширенный режим «Терапия 2.0»
Август: обновление всех медитаций до второй версии
Сентябрь: релиз приложения в Google Play Store
`, { parse_mode: "Markdown" });
  } else if (query.data === "demo_access") {
    bot.sendMessage(chatId, "Для доступа к демо необходимо быть подписанным на канал @drestas. Проверьте подписку:", {
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
        // Удаляем сообщение с кнопками
        await bot.deleteMessage(chatId, messageId);

        // Отправляем доступ к демо
        await bot.sendMessage(chatId, "🎉 Подписка подтверждена! Переходи в демо-доступ 👇", {
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
      console.error(err);
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

// === Express-сервер для Replit ===
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
