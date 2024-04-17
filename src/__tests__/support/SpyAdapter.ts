import {
    LlmAdapter,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../llm.types'

export default class SpyAdapter implements LlmAdapter {
    public lastBot?: SprucebotLlmBot
    public lastMessage?: string
    public messageResponse = ''
    public lastSendOptions?: SendMessageOptions
    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ) {
        this.lastBot = bot
        this.lastSendOptions = options
        return this.messageResponse
    }
}
