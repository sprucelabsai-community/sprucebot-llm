import { assertOptions } from '@sprucelabs/schema'
import OpenAI from 'openai'
import {
    LlmAdapter,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../llm.types'
import OpenAiMessageBuilder from './OpenAiMessageBuilder'

export class OpenAiAdapter implements LlmAdapter {
    public static OpenAI = OpenAI
    private api: OpenAI

    protected constructor(apiKey: string) {
        assertOptions({ apiKey }, ['apiKey'])
        this.api = new OpenAiAdapter.OpenAI({ apiKey })
    }

    public static Adapter(apiKey: string) {
        return new this(apiKey)
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ): Promise<string> {
        const messageBuilder = OpenAiMessageBuilder.Builder(bot)
        const messages = messageBuilder.buildMessages()

        const response = await this.api.chat.completions.create({
            messages,
            model: options?.model ?? 'gpt-4o',
        })

        const message =
            response.choices?.[0]?.message?.content?.trim() ??
            MESSAGE_RESPONSE_ERROR_MESSAGE

        return message
    }
}

export const MESSAGE_RESPONSE_ERROR_MESSAGE =
    "Oh no! Something went wrong and I can't talk right now!"
