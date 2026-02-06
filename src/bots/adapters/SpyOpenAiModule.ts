import OpenAI, { ClientOptions } from 'openai'
import { RequestOptions } from 'openai/internal/request-options'
import {
    ChatCompletion,
    ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources'

export default class SpyOpenAiModule extends OpenAI {
    public static config?: ClientOptions
    public static lastSentCompletion?: ChatCompletionCreateParamsNonStreaming
    public static responseMessage: string | false = 'hello!'
    public static lastCompletionOptions?: RequestOptions | undefined
    public static errorToThrowOnCreate?: Error

    public constructor(config: ClientOptions) {
        super(config)
        SpyOpenAiModule.config = config
    }

    //@ts-ignore
    public chat = {
        completions: {
            create: this.createCompletion.bind(this),
        },
    }

    private async createCompletion(
        completion: ChatCompletionCreateParamsNonStreaming,
        options?: RequestOptions
    ): Promise<Response> {
        SpyOpenAiModule.lastSentCompletion = completion
        SpyOpenAiModule.lastCompletionOptions = options
        const choices: ChatCompletion.Choice[] = []

        if (SpyOpenAiModule.errorToThrowOnCreate) {
            throw SpyOpenAiModule.errorToThrowOnCreate
        }

        if (SpyOpenAiModule.responseMessage) {
            choices.push({
                finish_reason: 'stop',
                index: 0,
                logprobs: null,
                message: {
                    content: SpyOpenAiModule.responseMessage,
                    role: 'assistant',
                    refusal: null,
                },
            })
        }

        return {
            id: 'cmpl-1',
            model: 'text-davinci-003',
            created: 0,
            choices,
            object: 'chat.completion',
        }
    }
}

type Response = ChatCompletion
