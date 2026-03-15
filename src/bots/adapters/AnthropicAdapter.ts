import { assertOptions, Schema } from '@sprucelabs/schema'
import { Log } from '@sprucelabs/spruce-skill-utils'
import Anthropic from '@anthropic-ai/sdk'
import { RequestOptions } from '@anthropic-ai/sdk/internal/request-options'
import { MessageParam } from '@anthropic-ai/sdk/resources'
import { RequestOptions as OpenAiRequestOptions } from 'openai/internal/request-options'
import { ChatCompletionMessageParam } from 'openai/resources'
import {
    LlmAdapter,
    SprucebotLlmBot,
    SendMessageOptions,
    LllmReasoningEffort,
} from '../../llm.types'
import { MessageBuilderCacheMarker } from './MessageBuilder'
import MessageSenderImpl, {
    MessageHandlerSendHandlerParams,
    MessageSender,
} from './MessageSender'

export default class AnthropicAdapter implements LlmAdapter {
    public static Class?: new (
        apiKey: string,
        options?: AnthropicAdapterOptions
    ) => LlmAdapter
    public static Anthropic = Anthropic
    private api: Anthropic
    private model = 'claude-sonnet-4-5'
    private maxTokens: number
    private sender: MessageSender
    private memoryLimit?: number
    private isThinkingEnabled = false
    private log?: Log

    private constructor(apiKey: string, options: AnthropicAdapterOptions) {
        assertOptions({ apiKey, maxTokens: options?.maxTokens }, [
            'apiKey',
            'maxTokens',
        ])

        const { log, memoryLimit, maxTokens, thinking, model } = options

        this.api = new AnthropicAdapter.Anthropic({ apiKey })
        this.maxTokens = maxTokens
        this.model = model ?? this.model
        this.memoryLimit = memoryLimit
        this.isThinkingEnabled = thinking ?? false
        this.log = log?.buildLog('AnthropicAdapter')
        this.sender = MessageSenderImpl.Sender(this.sendHandler.bind(this), log)
    }

    public static Adapter(apiKey: string, options: AnthropicAdapterOptions) {
        return new (this.Class ?? this)(apiKey, options)
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
        params: MessageHandlerSendHandlerParams,
        sendOptions: OpenAiRequestOptions
    ) {
        const { messages: openAiMessages, model } = params
        const messages: MessageParam[] = []

        const cacheMarkerIdx = openAiMessages.findIndex(
            (msg) => (msg as MessageBuilderCacheMarker).cache_marker
        )

        for (const msg of openAiMessages) {
            if (!(msg as MessageBuilderCacheMarker).cache_marker) {
                const m = msg as ChatCompletionMessageParam
                messages.push({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content as string,
                })
            }
        }

        if (cacheMarkerIdx > -1) {
            messages[cacheMarkerIdx - 1].content = [
                {
                    type: 'text',
                    text: messages[cacheMarkerIdx - 1].content as string,
                    cache_control: {
                        type: 'ephemeral',
                    },
                },
            ]
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

        const { usage } = response
        this.log?.info(
            `[TOKEN USAGE] input=${usage.input_tokens} cache_create=${usage.cache_creation_input_tokens ?? 0} cache_read=${usage.cache_read_input_tokens ?? 0} output=${usage.output_tokens}`
        )

        const text = response.content
            .filter((block) => block.type === 'text')
            ?.map((block) => block.text)
            .join('')
            .trim()

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
