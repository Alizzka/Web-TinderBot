const {Configuration, OpenAIApi} = require('openai');
const axios = require('axios');

class ChatGptService {
    constructor(token) {
        if (token.startsWith('gpt:')) {
            token = 'sk-proj-' + token.slice(4).split('').reverse().join('');
        }
        const configuration = new Configuration({
            apiKey: token,
            baseOptions: {
                httpAgent: axios.create({proxy: {host: '18.199.183.77', port: 49232}})
            }
        });
        this.client = new OpenAIApi(configuration);
        this.messageList = [];
    }

    async sendMessageList() {
        const completion = await this.client.createChatCompletion({
            model: 'gpt-4o',  // gpt-4o, gpt-4-turbo, gpt-3.5-turbo
            messages: this.messageList,
            max_tokens: 3000,
            temperature: 0.9
        });

        const message = completion.data.choices[0].message;
        this.messageList.push(message);
        return message.content;
    }

    setPrompt(promptText) {
        this.messageList = [{role: 'system', content: promptText}];
    }

    async addMessage(messageText) {
        this.messageList.push({role: 'user', content: messageText});
        return await this.sendMessageList();
    }

    async sendQuestion(promptText, messageText) {
        this.messageList = [
            {role: 'system', content: promptText},
            {role: 'user', content: messageText}
        ];
        return await this.sendMessageList();
    }
}

module.exports = ChatGptService;