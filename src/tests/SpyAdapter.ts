import { generateId } from '@sprucelabs/test-utils'
import { OpenAiAdapterOptions } from '../bots/adapters/OpenAiAdapter'
import {
    LllmReasoningEffort,
    LlmAdapter,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../llm.types'

export default class SpyLlmAdapter implements LlmAdapter {
    public static instance: SpyLlmAdapter
    public lastSendMessageBot?: SprucebotLlmBot
    public lastMessage?: string
    public lastSendMessageResponse = generateId()
    public lastSendMessageOptions?: SendMessageOptions
    public responseDelayMs?: number
    public manuallySetModel?: string
    public apiKey: string
    public constructorOptions?: OpenAiAdapterOptions
    public shouldRandomizeResponseMessage = true

    public constructor(apiKey: string, options?: OpenAiAdapterOptions) {
        SpyLlmAdapter.instance = this
        this.apiKey = apiKey
        this.constructorOptions = options
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ) {
        this.lastSendMessageBot = bot
        this.lastSendMessageOptions = options

        if (this.responseDelayMs) {
            await new Promise((resolve) =>
                setTimeout(resolve, this.responseDelayMs)
            )
        }

        if (this.shouldRandomizeResponseMessage) {
            this.lastSendMessageResponse = generateId()
        }
        return this.lastSendMessageResponse
    }

    public setModel(model: string): void {
        this.manuallySetModel = model
    }

    public setReasoningEffort(_effort: LllmReasoningEffort): void {}
}
