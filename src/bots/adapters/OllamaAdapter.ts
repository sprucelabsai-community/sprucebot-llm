import { Schema } from '@sprucelabs/schema'
import {
    LlmAdapter,
    SprucebotLlmBot,
    SendMessageOptions,
} from '../../llm.types'
import OpenAiAdapter from './OpenAiAdapter'

export default class OllamaAdapter implements LlmAdapter {
    private openai: OpenAiAdapter
    private think: boolean
    private constructor(options?: OllamaOptions) {
        this.think = options?.think ?? false
        this.openai = OpenAiAdapter.Adapter('***', {
            ...options,
            baseUrl: 'http://localhost:11434/v1',
        })
    }

    public static Adapter(options?: OllamaOptions) {
        return new this(options)
    }

    public async sendMessage(
        bot: SprucebotLlmBot<Schema>,
        options?: SendMessageOptions
    ): Promise<string> {
        //@ts-ignore
        return this.openai.sendMessage(bot, { ...options, think: this.think })
    }
}

interface OllamaOptions {
    model?: string
    think?: boolean
}
