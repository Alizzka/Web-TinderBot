process.env.NTBA_FIX_350 = 1;

const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const fs = require('fs');

class HtmlTelegramBot extends TelegramBot {
    constructor(token) {
        super(token, {polling: true});
        this.singleChatId = null;
    }

    onCommand(regexp, callback) {
        this.onText(regexp, async (msg) => {
            this.singleChatId = msg.chat.id != null ? msg.chat.id : this.singleChatId;

            await callback.call(this, msg);
        });
    }

    onTextMessage(callback) {
        this.on('message', async (msg) => {
            this.singleChatId = msg.chat.id != null ? msg.chat.id : this.singleChatId;
            const text = msg.text;
            if (text == null || text.startsWith("/")) return;

            await callback.call(this, msg);
        });
    }

    onButtonCallback(regexp, callback) {
        this.on('callback_query', async (callbackQuery) => {
            const query = callbackQuery.data;
            if (regexp.test(query)) {
                this.singleChatId = callbackQuery.message.chat.id != null ? callbackQuery.message.chat.id : this.singleChatId;

                await this.answerCallbackQuery(callbackQuery.id);
                await callback.call(this, callbackQuery);
            }
        });
    }

    async sendHTML(html, options = {}) {
        let cssPath = '/../resources/html/main.css';
        if (options && options.theme === "dark")
            cssPath = '/../resources/html/dark-theme.css';
        if (options && options.theme === "light")
            cssPath = '/../resources/html/light-theme.css';

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(__dirname + "/../resources/html/main.html")
        await page.setContent(html);
        await page.addStyleTag({path: __dirname + cssPath});

        await page.setViewport({width: 420, height: 50});
        const bodyHandle = await page.$('body');
        const {height} = await bodyHandle.boundingBox();
        await bodyHandle.dispose();

        await page.setViewport({width: 420, height: Math.ceil(height)});
        await page.screenshot({path: '../resources/screenshot.png'});
        await browser.close();

        return await super.sendPhoto(this.singleChatId, fs.createReadStream(`../resources/screenshot.png`), {contentType: 'image/png'});
    }

    async sendText(text, options = {}) {
        return await super.sendMessage(this.singleChatId, text, {parse_mode: 'HTML', ...options});
    }

    async sendTextButtons(text, buttons, options = {}) {
        const keyboard = Object.keys(buttons).map(key => [{text: buttons[key], callback_data: key}]);
        const replyMarkup = {inline_keyboard: keyboard};
        return await super.sendMessage(this.singleChatId, text, {parse_mode: 'HTML', ...options, reply_markup: replyMarkup});
    }

    async sendImage(name) {
        return await super.sendPhoto(this.singleChatId, fs.createReadStream(`../resources/images/${name}.jpg`), {contentType: 'image/jpeg'});
    }

    async showMainMenu(commands) {
        const commandList = Object.keys(commands).map(key => ({command: key, description: commands[key]}));
        await super.setMyCommands(commandList);
    }

    async editText(myMessage, newText) {
        await super.editMessageText(newText, {chat_id: myMessage.chat.id, message_id: myMessage.message_id});
    }

    loadMessage(name) {
        return fs.readFileSync(`../resources/messages/${name}.txt`, 'utf8');
    }

    loadHtml(name) {
        return fs.readFileSync(`../resources/html/${name}.html`, 'utf8');
    }

    loadPrompt(name) {
        return fs.readFileSync(`../resources/prompts/${name}.txt`, 'utf8');
    }
}

function userInfoToString(user) {
    const map = {
        name: "Имя",
        sex: "Пол",
        age: "Возраст",
        city: "Город",
        occupation: "Профессия",
        hobby: "Хобби",
        goals: "Цели знакомства",
        handsome: "Красота, привлекательность в баллах (максимум 10 баллов)",
        wealth: "Доход, богатство",
        annoys: "В людях раздражает"
    };
    let result = '';
    for (const key in map) {
        if (user[key]) {
            result += `${map[key]}: ${user[key]}\n`;
        }
    }
    return result;
}

module.exports = {
    HtmlTelegramBot,
    userInfoToString
};