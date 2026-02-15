import { Log } from '@sprucelabs/spruce-skill-utils'
import OpenAI, { APIUserAbortError } from 'openai'
import { RequestOptions } from 'openai/internal/request-options'
import {
    ReasoningEffort,
    ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources'
import { SprucebotLlmBot, SendMessageOptions } from '../../llm.types'
import { MESSAGE_RESPONSE_ERROR_MESSAGE } from './OpenAiAdapter'
import OpenAiMessageBuilder from './OpenAiMessageBuilder'

export default class MessageSenderImpl implements MessageSender {
    public static AbortController = AbortController
    private log?: Log
    private lastAbortController?: AbortController
    private sendHandler: MessageSenderSendHandler

    private constructor(send: MessageSenderSendHandler, log?: Log) {
        this.log = log
        this.sendHandler = send
    }

    public static Sender(send: MessageSenderSendHandler, log?: Log) {
        return new this(send, log) as MessageSender
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options: MessageSenderSendMessageOptions
    ): Promise<string> {
        const { memoryLimit, ...rest } = options

        const messageBuilder = OpenAiMessageBuilder.Builder(bot, {
            memoryLimit,
        })

        const messages = messageBuilder.buildMessages()

        this.log?.info('Sending message', JSON.stringify(messages, null, 2))

        try {
            this.lastAbortController?.abort('Interrupted by new message')
            this.lastAbortController = new MessageSenderImpl.AbortController()

            const response = await this.send({
                messages,
                ...rest,
                abortController: this.lastAbortController,
            })

            delete this.lastAbortController

            const message = response ?? MESSAGE_RESPONSE_ERROR_MESSAGE

            this.log?.info('Received response', message)

            return message
        } catch (err: any) {
            if (err instanceof APIUserAbortError) {
                this.log?.info('Request was aborted')
                return ''
            }
            throw err
        }
    }

    private async send(options: MessageSenderSendOptions) {
        const { abortController, reasoningEffort, ...restOptions } = options

        const params: ChatCompletionCreateParamsNonStreaming = {
            ...restOptions,
        }

        if (reasoningEffort) {
            params.reasoning_effort = reasoningEffort
        }

        const response = await this.sendHandler(params, {
            signal: abortController.signal,
        })

        return response
    }
}

export type MessageSenderSendOptions = SendMessageOptions & {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    reasoningEffort?: ReasoningEffort
    model: string
    abortController: AbortController
}

export type MessageSenderSendHandler = (
    params: ChatCompletionCreateParamsNonStreaming,
    options: RequestOptions
) => Promise<string | undefined>

export interface MessageSender {
    sendMessage(
        bot: SprucebotLlmBot,
        options: MessageSenderSendMessageOptions
    ): Promise<string>
}

export type MessageSenderSendMessageOptions = SendMessageOptions & {
    memoryLimit?: number
    reasoningEffort?: ReasoningEffort
    model: string
}
