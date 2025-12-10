import { LlmAdapter, SendMessageOptions, SprucebotLlmBot } from '../llm.types'

export default class SpyLlmAdapter implements LlmAdapter {
    public lastBot?: SprucebotLlmBot
    public lastMessage?: string
    public messageResponse = ''
    public lastSendOptions?: SendMessageOptions
    public responseDelayMs?: number

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ) {
        this.lastBot = bot
        this.lastSendOptions = options

        if (this.responseDelayMs) {
            await new Promise((resolve) =>
                setTimeout(resolve, this.responseDelayMs)
            )
        }

        return this.messageResponse
    }
}
