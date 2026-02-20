import { Schema } from '@sprucelabs/schema'
import {
    LlmAdapter,
    SprucebotLlmBot,
    SendMessageOptions,
    LllmReasoningEffort,
} from '../../llm.types'
import OpenAiAdapter from './OpenAiAdapter'

export default class OllamaAdapter implements LlmAdapter {
    private openai: LlmAdapter
    private think: boolean
    private constructor(options?: OllamaOptions) {
        this.think = options?.think ?? false
        this.openai = OpenAiAdapter.Adapter('***', {
            baseUrl: 'http://localhost:11434/v1',
            ...options,
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

    public setModel(model: string): void {
        this.openai.setModel(model)
    }
    public setReasoningEffort(effort: LllmReasoningEffort): void {
        this.think = effort === 'high'
    }
}

interface OllamaOptions {
    model?: string
    think?: boolean
    baseUrl?: string
}
