import OpenAI from 'openai'
import {
    ChatCompletion,
    ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources'

export default class SpyOpenAiApi extends OpenAI {
    public static config?: OpenAiOptions
    public static lastSentCompletion?: ChatCompletionCreateParamsNonStreaming
    public static responseMessage: string | false = 'hello!'

    public constructor(config: OpenAiOptions) {
        super(config)
        SpyOpenAiApi.config = config
    }

    //@ts-ignore
    public chat = {
        completions: {
            create: this.createCompletion.bind(this),
        },
    }

    private async createCompletion(
        options: ChatCompletionCreateParamsNonStreaming
    ): Promise<Response> {
        SpyOpenAiApi.lastSentCompletion = options
        const choices: ChatCompletion.Choice[] = []

        if (SpyOpenAiApi.responseMessage) {
            choices.push({
                finish_reason: 'stop',
                index: 0,
                logprobs: null,
                message: {
                    content: SpyOpenAiApi.responseMessage,
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

interface OpenAiOptions {
    apiKey: string
}
