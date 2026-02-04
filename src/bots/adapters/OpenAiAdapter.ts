import { assertOptions } from '@sprucelabs/schema'
import { Log } from '@sprucelabs/spruce-skill-utils'
import OpenAI from 'openai'
import {
    ChatCompletionCreateParamsNonStreaming,
    ReasoningEffort,
} from 'openai/resources'
import {
    LlmAdapter,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../llm.types'
import OpenAiMessageBuilder from './OpenAiMessageBuilder'

export default class OpenAiAdapter implements LlmAdapter {
    public static Class: new (
        apiKey: string,
        options?: OpenAiAdapterOptions
    ) => OpenAiAdapter
    public static OpenAI = OpenAI
    private api: OpenAI
    private log?: Log
    private model = 'gpt-4o'
    private memoryLimit?: number
    private reasoningEffort?: ReasoningEffort

    protected constructor(apiKey: string, options?: OpenAiAdapterOptions) {
        assertOptions({ apiKey }, ['apiKey'])
        const { log, memoryLimit, model, reasoningEffort, baseUrl } =
            options || {}

        this.api = new OpenAiAdapter.OpenAI({ apiKey, baseURL: baseUrl })
        this.log = log
        this.memoryLimit = memoryLimit
        this.model = model ?? this.model
        this.reasoningEffort = reasoningEffort
    }

    public static Adapter(apiKey: string, options?: OpenAiAdapterOptions) {
        return new (this.Class ?? this)(apiKey, options)
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ): Promise<string> {
        const messageBuilder = OpenAiMessageBuilder.Builder(bot, {
            memoryLimit: this.memoryLimit,
        })
        const messages = messageBuilder.buildMessages()

        this.log?.info(
            'Sending message to OpenAI',
            JSON.stringify(messages, null, 2)
        )

        const params: ChatCompletionCreateParamsNonStreaming = {
            messages,
            model: this.model,
            ...options,
        }

        const reasoningEffort = this.getReasoningEffort()
        if (reasoningEffort) {
            params.reasoning_effort = reasoningEffort
        }

        const response = await this.api.chat.completions.create(params)

        const message =
            response.choices?.[0]?.message?.content?.trim() ??
            MESSAGE_RESPONSE_ERROR_MESSAGE

        this.log?.info('Received response from OpenAI', message)

        return message
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
