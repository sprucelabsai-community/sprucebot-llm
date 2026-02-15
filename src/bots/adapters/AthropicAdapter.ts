import { assertOptions, Schema } from '@sprucelabs/schema'
import Anthropic from '@anthropic-ai/sdk'
import { RequestOptions } from '@anthropic-ai/sdk/internal/request-options'
import { MessageParam, TextBlock } from '@anthropic-ai/sdk/resources'
import OpenAI from 'openai'
import { RequestOptions as OpenAiRequestOptions } from 'openai/internal/request-options'
import {
    LlmAdapter,
    SprucebotLlmBot,
    SendMessageOptions,
    LllmReasoningEffort,
} from '../../llm.types'
import MessageSenderImpl, { MessageSender } from './MessageSender'

export default class AthropicAdapter implements LlmAdapter {
    public static Anthropic = Anthropic
    private api: Anthropic
    private model = 'claude-sonnet-4-5'
    private maxTokens: number
    private sender: MessageSender

    public constructor(apiKey: string, options: { maxTokens: number }) {
        assertOptions({ apiKey, maxTokens: options?.maxTokens }, [
            'apiKey',
            'maxTokens',
        ])
        this.api = new AthropicAdapter.Anthropic({ apiKey })
        this.maxTokens = options.maxTokens
        this.sender = MessageSenderImpl.Sender(this.sendHandler.bind(this))
    }

    public async sendMessage(
        bot: SprucebotLlmBot<Schema>,
        options?: SendMessageOptions
    ): Promise<string> {
        const text = await this.sender.sendMessage(bot, {
            model: this.model,
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
            },
            sendOptions as RequestOptions
        )

        const text = (response.content?.[0] as TextBlock)?.text
        return text
    }

    public setModel(model: string): void {
        this.model = model
    }

    public setReasoningEffort(_effort: LllmReasoningEffort): void {}
}
