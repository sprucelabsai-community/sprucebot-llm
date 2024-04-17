import { assertOptions } from '@sprucelabs/schema'
import { Configuration, OpenAIApi } from 'openai'
import {
    LlmAdapter,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../llm.types'
import PromptGenerator from '../PromptGenerator'

export class OpenAiAdapter implements LlmAdapter {
    public static Configuration = Configuration
    public static OpenAIApi = OpenAIApi
    private api: OpenAIApi

    public constructor(apiKey: string) {
        assertOptions({ apiKey }, ['apiKey'])
        const config = new OpenAiAdapter.Configuration({ apiKey })
        this.api = new OpenAiAdapter.OpenAIApi(config)
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ): Promise<string> {
        const generator = PromptGenerator.Generator(bot, {
            promptTemplate: options?.promptTemplate,
        })
        const prompt = await generator.generate()

        const response = await this.api.createCompletion({
            prompt,
            model: options?.model ?? 'text-davinci-003',
            max_tokens: 250,
            stop: ['__Me__:'],
        })

        return (
            response.data.choices[0]?.text?.trim() ??
            MESSAGE_RESPONSE_ERROR_MESSAGE
        )
    }
}

export const MESSAGE_RESPONSE_ERROR_MESSAGE =
    "Oh no! Something went wrong and I can't talk right now!"
