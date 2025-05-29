const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Нажми кнопку, чтобы открыть WebApp:', {
    reply_markup: {
      keyboard: [
        [
          {
            text: '🌀 Перейти в WebApp',
            web_app: {
              url: 'https://soulreset.ru/play/1(1).Born.html?token=' + ctx.from.id
            }
          }
        ]
      ],
      resize_keyboard: true
    }
  });
});

bot.launch();
