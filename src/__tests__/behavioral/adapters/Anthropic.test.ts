import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import Anthropic, { ClientOptions } from '@anthropic-ai/sdk'
import { RequestOptions } from '@anthropic-ai/sdk/internal/request-options'
import { Message } from '@anthropic-ai/sdk/resources'
import {
    ContentBlock,
    MessageCreateParamsBase,
    MessageParam,
    Usage,
} from '@anthropic-ai/sdk/resources/messages'

import AnthropicAdapter, {
    AnthropicAdapterOptions,
} from '../../../bots/adapters/AnthropicAdapter'
import MessageSenderImpl from '../../../bots/adapters/MessageSender'
import OpenAiMessageBuilder from '../../../bots/adapters/OpenAiMessageBuilder'
import {
    LllmReasoningEffort,
    SendMessageOptions,
    SprucebotLlmBot,
} from '../../../llm.types'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { MockAbortController, StubAbortSignal } from './MockAbortController'
import MockMessegeSender from './MockMessageSender'

@suite()
export default class AthropicTest extends AbstractLlmTest {
    private bot!: SprucebotLlmBot
    private apiKey = generateId()
    private anthropic!: AnthropicAdapter
    private messages!: OpenAiMessageBuilder
    private maxTokens = Date.now() * Math.random()
    private model = 'claude-sonnet-4-5'
    private isThinkingEnabled = false

    protected async beforeEach() {
        await super.beforeEach()
        AnthropicAdapter.Anthropic = MockAthropicModule
        MockAbortController.instances = []
        MessageSenderImpl.AbortController = MockAbortController
        delete MessageSenderImpl.Class

        this.anthropic = this.Anthropic()
        this.bot = this.Bot()
        this.messages = OpenAiMessageBuilder.Builder(this.bot)
    }

    @test()
    protected async throwsWithMissing() {
        //@ts-ignore
        const err = assert.doesThrow(() => new AnthropicAdapter())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['apiKey', 'maxTokens'],
        })
    }

    @test()
    protected async passesApiKeyToAnthropic() {
        this.mockAnthropic.assertConstructorOptionsEqual({
            apiKey: this.apiKey,
        })
    }

    @test()
    protected async sendingMessageCreatesOnAdapter() {
        await this.appendMessageToBot()
        this.mockAnthropic.assertDidNotCreateMessage()
        await this.send()
        this.mockAnthropic.assertDidCreateMessage()
    }

    @test()
    protected async passesExpectedMessageToCreate() {
        await this.sendMessage()

        this.assertSentExpectedBodyToCreate()
    }

    @test()
    protected async canChangeModel() {
        this.model = 'claude-2'
        this.anthropic.setModel(this.model)
        await this.sendMessage()
        this.assertSentExpectedBodyToCreate()
    }

    @test()
    protected async returnsMessageFromAdapter() {
        const expected = generateId()
        this.mockAnthropic.setResponseContent([
            {
                type: 'text',
                text: expected,
                citations: [],
            },
        ])

        await this.sendMessageAndAssertResponseEquals(expected)
    }

    @test()
    protected async passesAbortSignal() {
        await this.sendMessage()
        assert.isTruthy(
            MockAbortController.instances[0],
            'Expected to create an AbortController instance'
        )

        this.mockAnthropic.assertPassedAbortSignalToCreateMessage(
            MockAbortController.instances[0].signal
        )
    }

    @test()
    protected async canSendDifferentModelThroughSendMessage() {
        this.model = generateId()
        await this.sendMessage({ model: this.model })
        this.assertSentExpectedBodyToCreate()
    }

    @test()
    protected async passesThroughMemoryLimitToModuleFromConstructor() {
        MessageSenderImpl.Class = MockMessegeSender
        const memoryLimit = Math.round(Date.now() * Math.random())
        this.anthropic = this.Anthropic({
            memoryLimit,
        })

        await this.sendMessage()

        MockMessegeSender.instance.assertSendReceivedMemoryLimit(memoryLimit)
    }

    @test()
    protected async thinkingThrouhConstructorPassesThrough() {
        this.isThinkingEnabled = true

        this.anthropic = this.Anthropic({
            thinking: true,
        })

        await this.sendMessage()

        this.assertSentExpectedBodyToCreate()
    }

    @test('enables thinking with reasoning effort high', 'high')
    @test('enables thinking with reasoning effort medium', 'medium')
    protected async canEnableThinkingWithPublicSetter(
        effort: LllmReasoningEffort
    ) {
        this.setReasoningEffort(effort)
        await this.sendMessage()
        this.assertSentExpectedBodyToCreate()
    }

    @test()
    protected async canDisableThinkingWithPublicSetter() {
        this.setReasoningEffort('high')
        this.setReasoningEffort('none')
        await this.sendMessage()
        this.assertSentExpectedBodyToCreate()
    }

    @test()
    protected async handlesTextBlockComingInSecond() {
        const expected = generateId()
        this.mockAnthropic.setResponseContent([
            {
                type: 'thinking',
                signature: generateId(),
                thinking: generateId(),
            },
            {
                type: 'text',
                text: expected,
                citations: [],
            },
        ])

        await this.sendMessageAndAssertResponseEquals(expected)
    }

    private async sendMessageAndAssertResponseEquals(expected: string) {
        const response = await this.sendMessage()
        assert.isEqual(
            response,
            expected,
            'Adapter did not return first text block content'
        )
    }

    private setReasoningEffort(effort: LllmReasoningEffort) {
        this.isThinkingEnabled = effort !== 'none'
        this.anthropic.setReasoningEffort(effort)
    }

    private assertSentExpectedBodyToCreate() {
        this.mockAnthropic.assertSendMessageBodyEquals({
            max_tokens: this.maxTokens,
            model: this.model,
            messages: this.expectedMessages,
            thinking: !this.isThinkingEnabled
                ? { type: 'disabled' }
                : { type: 'adaptive' },
        })
    }

    private async sendMessage(options?: SendMessageOptions) {
        await this.appendMessageToBot()
        return await this.send(options)
    }

    private get expectedMessages() {
        const openAiMessages = this.messages.buildMessages()

        const expected: MessageParam[] = []

        for (const msg of openAiMessages) {
            expected.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content as string,
            })
        }
        return expected
    }

    private async appendMessageToBot() {
        await this.bot.sendMessage(generateId())
    }

    private async send(options?: SendMessageOptions) {
        return await this.anthropic.sendMessage(this.bot, options)
    }

    private Anthropic(
        options?: Partial<AnthropicAdapterOptions>
    ): AnthropicAdapter {
        return new AnthropicAdapter(this.apiKey, {
            maxTokens: this.maxTokens,
            ...options,
        })
    }

    private get mockAnthropic() {
        assert.isTruthy(
            MockAthropicModule.instance,
            `Expected Anthropic to be instantiated`
        )

        return MockAthropicModule.instance
    }
}

class MockAthropicModule extends Anthropic {
    public static instance: MockAthropicModule
    private fakedResponse: Message = {
        content: [],
        id: generateId(),
        model: generateId(),
        stop_reason: null,
        stop_sequence: null,
        role: 'assistant',
        type: 'message',
        usage: {} as Usage,
    }
    private constructorOptions?: ClientOptions
    private didCreateMessage = false
    private sendMessageBody?: MessageCreateParamsBase
    private sendMessageOptions?: RequestOptions

    public constructor(options?: ClientOptions) {
        super({})
        this.constructorOptions = options
        MockAthropicModule.instance = this

        //@ts-ignore
        this.messages.create = async (
            body: MessageCreateParamsBase,
            options?: RequestOptions
        ) => {
            this.sendMessageBody = body
            this.sendMessageOptions = options
            this.didCreateMessage = true
            return this.fakedResponse
        }
    }

    public assertConstructorOptionsEqual(expected: ClientOptions) {
        assert.isEqualDeep(
            this.constructorOptions,
            expected,
            'Constructor options do not match'
        )
    }

    public assertDidCreateMessage() {
        assert.isTrue(
            this.didCreateMessage,
            'Expected to create a message. Use anthropic.messages.create() to create a message.'
        )
    }

    public assertDidNotCreateMessage() {
        assert.isFalse(
            this.didCreateMessage,
            'Expected to not create a message, but did.'
        )
    }

    public assertSendMessageBodyEquals(expected: MessageCreateParamsBase) {
        assert.isEqualDeep(
            this.sendMessageBody,
            expected,
            'Send message body does not match'
        )
    }

    public setResponseContent(content: ContentBlock[]): void {
        this.fakedResponse.content = content
    }

    public assertPassedAbortSignalToCreateMessage(expected: StubAbortSignal) {
        assert.isEqual(
            this.sendMessageOptions?.signal,
            expected,
            'Expected to pass the AbortController signal to messages.create()'
        )
    }
}
