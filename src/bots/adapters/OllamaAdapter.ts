import { Schema } from '@sprucelabs/schema'
import { Log } from '@sprucelabs/spruce-skill-utils'
import {
    LlmAdapter,
    SprucebotLlmBot,
    SendMessageOptions,
    LllmReasoningEffort,
} from '../../llm.types'
import OpenAiAdapter from './OpenAiAdapter'

export default class OllamaAdapter implements LlmAdapter {
    public static Class?: new (
        apiKey: string,
        options?: OllamaAdapterOptions
    ) => LlmAdapter

    private openai: LlmAdapter
    private think: boolean

    private constructor(_apiKey: string, options?: OllamaAdapterOptions) {
        this.think = options?.think ?? false
        this.openai = OpenAiAdapter.Adapter('***', {
            baseUrl: 'http://localhost:11434/v1',
            ...options,
        })
    }

    public static Adapter(options?: OllamaAdapterOptions) {
        return new (this.Class ?? this)('***', options)
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

export interface OllamaAdapterOptions {
    log?: Log
    model?: string
    think?: boolean
    baseUrl?: string
    memoryLimit?: number
}
