import { assertOptions, Schema } from '@sprucelabs/schema'
import { Log } from '@sprucelabs/spruce-skill-utils'
import Anthropic from '@anthropic-ai/sdk'
import { RequestOptions } from '@anthropic-ai/sdk/internal/request-options'
import { MessageParam } from '@anthropic-ai/sdk/resources'
import OpenAI from 'openai'
import { RequestOptions as OpenAiRequestOptions } from 'openai/internal/request-options'
import {
    LlmAdapter,
    SprucebotLlmBot,
    SendMessageOptions,
    LllmReasoningEffort,
} from '../../llm.types'
import MessageSenderImpl, { MessageSender } from './MessageSender'

export default class AnthropicAdapter implements LlmAdapter {
    public static Anthropic = Anthropic
    private api: Anthropic
    private model = 'claude-sonnet-4-5'
    private maxTokens: number
    private sender: MessageSender
    private memoryLimit?: number
    private isThinkingEnabled = false

    public constructor(apiKey: string, options: AnthropicAdapterOptions) {
        assertOptions({ apiKey, maxTokens: options?.maxTokens }, [
            'apiKey',
            'maxTokens',
        ])

        const { log, memoryLimit, maxTokens, thinking } = options

        this.api = new AnthropicAdapter.Anthropic({ apiKey })
        this.maxTokens = maxTokens
        this.memoryLimit = memoryLimit
        this.isThinkingEnabled = thinking ?? false
        this.sender = MessageSenderImpl.Sender(this.sendHandler.bind(this), log)
    }

    public async sendMessage(
        bot: SprucebotLlmBot<Schema>,
        options?: SendMessageOptions
    ): Promise<string> {
        const text = await this.sender.sendMessage(bot, {
            model: this.model,
            memoryLimit: this.memoryLimit,
            ...options,
        })

        return text
    }

    private async sendHandler(
        params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        sendOptions: OpenAiRequestOptions
    ) {
        const { messages: openAiMessages, model } = params
        const messages: MessageParam[] = []
        for (const msg of openAiMessages) {
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content as string,
            })
        }

        const response = await this.api.messages.create(
            {
                max_tokens: this.maxTokens,
                model,
                messages,
                thinking: {
                    type: this.isThinkingEnabled ? 'adaptive' : 'disabled',
                },
            },
            sendOptions as RequestOptions
        )

        const text = response.content.find(
            (block) => block.type === 'text'
        )?.text

        return text
    }

    public setModel(model: string): void {
        this.model = model
    }

    public setReasoningEffort(effort: LllmReasoningEffort): void {
        this.isThinkingEnabled = effort !== 'none'
    }
}

export interface AnthropicAdapterOptions {
    log?: Log
    memoryLimit?: number
    model?: string
    baseUrl?: string
    maxTokens: number
    thinking?: boolean
}
