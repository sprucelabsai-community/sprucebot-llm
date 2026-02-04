import OpenAI, { ClientOptions } from 'openai'
import {
    ChatCompletion,
    ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources'

export default class SpyOpenAiModule extends OpenAI {
    public static config?: ClientOptions
    public static lastSentCompletion?: ChatCompletionCreateParamsNonStreaming
    public static responseMessage: string | false = 'hello!'

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
        options: ChatCompletionCreateParamsNonStreaming
    ): Promise<Response> {
        SpyOpenAiModule.lastSentCompletion = options
        const choices: ChatCompletion.Choice[] = []

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
