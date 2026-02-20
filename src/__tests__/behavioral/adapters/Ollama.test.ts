import { test, assert, suite, generateId } from '@sprucelabs/test-utils'
import OllamaAdapter from '../../../bots/adapters/OllamaAdapter'
import OpenAiAdapter, {
    OpenAiAdapterOptions,
} from '../../../bots/adapters/OpenAiAdapter'
import {
    LllmReasoningEffort,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../../llm.types'
import SpyLlmAdapter from '../../../tests/SpyAdapter'
import SpyLlmBot from '../../../tests/SpyLlmBot'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class OllamaTest extends AbstractLlmTest {
    private ollama!: OllamaAdapter
    private bot!: SprucebotLlmBot

    protected async beforeEach() {
        await super.beforeEach()

        OpenAiAdapter.Class = SpyLlmAdapter
        this.ollama = OllamaAdapter.Adapter() as OllamaAdapter
        this.bot = new SpyLlmBot({
            adapter: this.ollama,
            youAre: generateId(),
        })
    }

    @test()
    protected async passesOptionsToOpenAiAdapter() {
        const options = {
            model: generateId(),
        }
        OllamaAdapter.Adapter(options)

        this.assertOpenAiConstructorOptionsEqual(options)
    }

    @test()
    protected async canOverrideBaseUrl() {
        const baseUrl = generateId()
        OllamaAdapter.Adapter({ baseUrl })
        this.assertOpenAiConstructorOptionsEqual({ baseUrl })
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
            this.lastSendMessageOptions,
            //@ts-ignore
            { ...options, think: false },
            'Options not passed correctly'
        )
    }

    @test()
    protected async returnsResponseFromSendMessage() {
        const response = await this.sendMessage()
        assert.isEqual(
            response,
            this.spyOpenAi.lastSendMessageResponse,
            'sendMessage response not returned correctly'
        )
    }

    @test()
    protected async thinkingPassedToSendMessage() {
        this.ollama = OllamaAdapter.Adapter({ think: true }) as OllamaAdapter
        await this.sendMessage()
        this.assertSentWithThinking()
    }

    @test()
    protected async canSetTheModalDirectly() {
        const model = generateId()
        this.ollama.setModel(model)
        await this.sendMessage()
        assert.isEqual(
            this.spyOpenAi.manuallySetModel,
            model,
            'Model not set correctly'
        )
    }

    @test()
    protected async settingReasoningToHighSetsThinkToTrue() {
        this.setReasoningEffort('high')
        await this.sendMessage()
        this.assertSentWithThinking()
    }

    @test('medium reasoning sets think to false', 'medium')
    @test('low reasoning sets think to false', 'low')
    protected async mediumReasoningDoesNotSetThinkToTrue(
        reasoning: LllmReasoningEffort
    ) {
        this.setReasoningEffort(reasoning)
        await this.sendMessage()
        this.assertThinkingEquals(false)
    }

    private setReasoningEffort(effort: LllmReasoningEffort) {
        this.ollama.setReasoningEffort(effort)
    }

    private assertSentWithThinking() {
        this.assertThinkingEquals(true)
    }

    private assertThinkingEquals(expected: boolean) {
        assert.isEqual(
            //@ts-ignore
            this.lastSendMessageOptions.think,
            expected,
            'Think not passed correctly'
        )
    }

    private get lastSendMessageOptions() {
        assert.isTruthy(
            this.spyOpenAi.lastSendMessageOptions,
            'No send message options recorded'
        )
        return this.spyOpenAi.lastSendMessageOptions
    }

    private async sendMessage(options?: SendMessageOptions) {
        return await this.ollama.sendMessage(this.bot, options)
    }

    private get spyOpenAi() {
        assert.isTruthy(
            SpyLlmAdapter.instance,
            'No OpenAiAdapter instance created'
        )
        return SpyLlmAdapter.instance
    }

    private assertOpenAiConstructorOptionsEqual(options: OpenAiAdapterOptions) {
        assert.isEqualDeep(
            this.spyOpenAi.constructorOptions,
            { baseUrl: 'http://localhost:11434/v1', ...options },
            'Options not passed correctly to OpenAiAdapter'
        )
    }
}
