import { test, assert, suite, generateId } from '@sprucelabs/test-utils'
import OllamaAdapter from '../../../bots/adapters/OllamaAdapter'
import OpenAiAdapter, {
    OpenAiAdapterOptions,
} from '../../../bots/adapters/OpenAiAdapter'
import { SendMessageOptions, SprucebotLlmBot } from '../../../llm.types'
import SpyLlmBot from '../../../tests/SpyLlmBot'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class OllamaTest extends AbstractLlmTest {
    private ollama!: OllamaAdapter
    private bot!: SprucebotLlmBot

    protected async beforeEach() {
        await super.beforeEach()

        OpenAiAdapter.Class = SpyOpenAiAdapter
        this.ollama = OllamaAdapter.Adapter()
        this.bot = new SpyLlmBot({
            adapter: this.ollama,
            youAre: generateId(),
        })
    }

    @test()
    protected async passesOptionsToOpenAiAdapter() {
        OpenAiAdapter.Class = SpyOpenAiAdapter
        const options = {
            model: generateId(),
        }
        OllamaAdapter.Adapter(options)

        assert.isEqualDeep(
            this.spyOpenAi.constructorOptions,
            { ...options, baseUrl: 'http://localhost:11434/v1' },
            'Options not passed correctly to OpenAiAdapter'
        )
    }

    @test()
    protected async passesArgsThroughToSendMessage() {
        const options: SendMessageOptions = {
            model: generateId(),
        }

        await this.sendMessage(options)

        assert.isEqual(
            this.spyOpenAi.lastSendMessageBot,
            this.bot,
            'Bot not passed correctly'
        )

        assert.isEqualDeep(
            this.spyOpenAi.lastSendMessageOptions,
            { ...options, think: false },
            'Options not passed correctly'
        )
    }

    @test()
    protected async returnsResponseFromSendMessage() {
        const response = await this.sendMessage()
        assert.isEqual(
            response,
            this.spyOpenAi.lastMessageResponse,
            'sendMessage response not returned correctly'
        )
    }

    @test()
    protected async thinkingPassedToSendMessage() {
        this.ollama = OllamaAdapter.Adapter({ think: true })
        await this.sendMessage()
        assert.isEqual(
            this.spyOpenAi.lastSendMessageOptions?.think,
            true,
            'Think not passed correctly'
        )
    }

    private async sendMessage(options?: SendMessageOptions) {
        return await this.ollama.sendMessage(this.bot, options)
    }

    private get spyOpenAi() {
        assert.isTruthy(
            SpyOpenAiAdapter.instance,
            'No OpenAiAdapter instance created'
        )
        return SpyOpenAiAdapter.instance
    }
}

export class SpyOpenAiAdapter extends OpenAiAdapter {
    public static instance: SpyOpenAiAdapter
    public constructorOptions?: OpenAiAdapterOptions
    public lastSendMessageBot?: SprucebotLlmBot
    public lastSendMessageOptions?: SendMessageOptions & { think?: boolean }
    public lastMessageResponse = generateId()

    public constructor(apiKey: string, options?: OpenAiAdapterOptions) {
        super(apiKey, options)
        SpyOpenAiAdapter.instance = this
        this.constructorOptions = options
    }

    public async sendMessage(
        bot: SprucebotLlmBot,
        options?: SendMessageOptions
    ): Promise<string> {
        this.lastSendMessageBot = bot
        this.lastSendMessageOptions = options
        this.lastMessageResponse = generateId()
        return this.lastMessageResponse
    }
}
