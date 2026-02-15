import { assertOptions } from '@sprucelabs/schema'
import { Log } from '@sprucelabs/spruce-skill-utils'
import OpenAI from 'openai'
import { RequestOptions } from 'openai/internal/request-options'
import { ReasoningEffort } from 'openai/resources'
import {
    LlmAdapter,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../llm.types'
import MessageSenderImpl, { MessageSender } from './MessageSender'

export default class OpenAiAdapter implements LlmAdapter {
    public static Class: new (
        apiKey: string,
        options?: OpenAiAdapterOptions
    ) => OpenAiAdapter
    public static OpenAI = OpenAI
    private api: OpenAI
    private model = 'gpt-4o'
    private memoryLimit?: number
    private reasoningEffort?: ReasoningEffort
    private sender: MessageSender

    protected constructor(apiKey: string, options?: OpenAiAdapterOptions) {
        assertOptions({ apiKey }, ['apiKey'])
        const { log, memoryLimit, model, reasoningEffort, baseUrl } =
            options || {}

        this.api = new OpenAiAdapter.OpenAI({ apiKey, baseURL: baseUrl })
        this.memoryLimit = memoryLimit
        this.model = model ?? this.model
        this.reasoningEffort = reasoningEffort
        this.sender = MessageSenderImpl.Sender(this.sendHandler.bind(this), log)
    }

    public static Adapter(apiKey: string, options?: OpenAiAdapterOptions) {
        return new (this.Class ?? this)(apiKey, options)
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ): Promise<string> {
        return this.sender.sendMessage(bot, {
            model: this.model,
            memoryLimit: this.memoryLimit,
            reasoningEffort: this.getReasoningEffort(),
            ...options,
        })
    }

    private async sendHandler(
        params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        sendOptions: RequestOptions
    ) {
        const response = await this.api.chat.completions.create(
            params,
            sendOptions
        )
        const responseMessage = response.choices?.[0]?.message?.content?.trim()

        return responseMessage
    }

    private getReasoningEffort() {
        return (this.reasoningEffort ?? process.env.OPENAI_REASONING_EFFORT) as
            | ReasoningEffort
            | undefined
    }

    public setModel(model: string) {
        this.model = model
    }

    public setMessageMemoryLimit(limit: number) {
        this.memoryLimit = limit
    }

    public setReasoningEffort(effort: ReasoningEffort) {
        this.reasoningEffort = effort
    }
}

export const MESSAGE_RESPONSE_ERROR_MESSAGE =
    "Oh no! Something went wrong and I can't talk right now!"

export interface OpenAiAdapterOptions {
    log?: Log
    memoryLimit?: number
    model?: string
    reasoningEffort?: ReasoningEffort
    baseUrl?: string
}
