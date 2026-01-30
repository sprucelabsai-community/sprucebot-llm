import { buildSchema, Schema, SelectFieldDefinition } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import OpenAI from 'openai'
import {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionMessageParam,
    ReasoningEffort,
} from 'openai/resources'
import OpenAiAdapter, {
    MESSAGE_RESPONSE_ERROR_MESSAGE,
} from '../../../bots/adapters/OpenAi'
import SpyOpenAiApi from '../../../bots/adapters/SpyOpenAiApi'
import { DONE_TOKEN, STATE_BOUNDARY } from '../../../bots/templates'
import {
    LlmCallbackMap,
    LlmMessage,
    SendMessageOptions,
    SkillOptions,
} from '../../../llm.types'
import SpyLlmBot from '../../../tests/SpyLlmBot'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class OpenAiTest extends AbstractLlmTest {
    private openAi!: OpenAiAdapter
    private bot!: SpyLlmBot
    private skillJob: string = generateId()
    private reasoningEffort?: string

    protected static async beforeAll(): Promise<void> {
        await super.beforeAll()
        assert.isEqual(OpenAiAdapter.OpenAI, OpenAI, 'OpenAI not set')
    }

    protected async beforeEach() {
        await super.beforeEach()

        delete process.env.OPENAI_PAST_MESSAGE_MAX_CHARS
        delete process.env.OPENAI_SHOULD_REMEMBER_IMAGES
        delete process.env.OPENAI_CHAT_HISTORY_LIMIT
        delete process.env.OPENAI_REASONING_EFFORT
        delete process.env.OPENAI_MESSAGE_MEMORY_LIMIT

        this.setupSpys()
        this.openAi = this.OpenAi()
        this.bot = this.Bot()
    }

    @test()
    protected async throwsWhenMissingKey() {
        //@ts-ignore
        const err = assert.doesThrow(() => new OpenAiAdapter())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['apiKey'],
        })
    }

    @test()
    protected async instantiatingOpenAiSetsKeyToConfig() {
        const key = generateId()
        this.OpenAi(key)
        assert.isEqual(SpyOpenAiApi.config?.apiKey, key)
    }

    @test()
    protected async canSendMessage() {
        const message = generateId()

        await this.setAndSendMessage(message)

        this.assertLastCompletionEquals([
            {
                role: 'user',
                content: message,
            },
        ])
    }

    @test()
    protected async returnsResponseFromSendMessage() {
        SpyOpenAiApi.responseMessage = generateId()
        await this.assertResponseEquals(SpyOpenAiApi.responseMessage)
    }

    @test()
    protected async trimsResponseMessage() {
        SpyOpenAiApi.responseMessage = ' hello world '
        await this.assertResponseEquals('hello world')
    }

    @test()
    protected async noResponseReturnsDefaultErrorMesssage() {
        SpyOpenAiApi.responseMessage = false
        await this.assertResponseEquals(MESSAGE_RESPONSE_ERROR_MESSAGE)
    }

    @test()
    protected async sendMessageCanAcceptModel() {
        const model =
            'davinci:ft-personal:sprucebot-concierge-2023-04-28-04-42-19'

        await this.setAndSendMessage(generateId(), {
            model,
        })

        this.assertModelSentEquals(model)
    }

    @test()
    protected async sendsAllMessagesToOpenAi() {
        const message1 = generateId()
        const message2 = generateId()
        this.bot.setMessages([
            {
                from: 'Me',
                message: message1,
            },
            {
                from: 'You',
                message: message2,
            },
        ])

        await this.sendMessage()

        this.assertLastCompletionEquals([
            {
                role: 'user',
                content: message1,
            },
            {
                role: 'assistant',
                content: message2,
            },
        ])
    }

    @test()
    protected async sendsExpectedMessageIfSkillIsPassedWithJustJustJob() {
        await this.setSkillSendMessageAndAssertSystemMessagesEqual({}, [])
    }

    @test()
    protected async sendsExpectedMessageIfSkillPassedWithWhenWeAreDone() {
        const doneWhen = generateId()
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                weAreDoneWhen: doneWhen,
            },
            [
                {
                    role: 'developer',
                    content: `Our conversation is done when ${doneWhen}. Once you determine we are done, send me the following message so I know we're done: ${DONE_TOKEN}`,
                },
            ]
        )
    }

    @test()
    protected async sendsExpectedWithOnePleaseKeepInMind() {
        const pleaseKeepInMind = [generateId()]
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                pleaseKeepInMindThat: pleaseKeepInMind,
            },
            [this.buildPleaseKeepInMindMessage(pleaseKeepInMind)]
        )
    }

    @test()
    protected async sendsExpectedWithMultiplePleaseKeepInMind() {
        const pleaseKeepInMind = [generateId(), generateId()]
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                pleaseKeepInMindThat: pleaseKeepInMind,
            },
            [
                {
                    role: 'developer',
                    content: `During this conversation, please keep the following in mind:\n\n1. ${pleaseKeepInMind[0]}\n2. ${pleaseKeepInMind[1]}.`,
                },
            ]
        )
    }

    @test()
    protected async sendsExpectedWithSchema() {
        await this.setSkillSendMessageWithSchemaAndAssertSystemMessagesEqualExpected(
            buildSchema({
                id: 'test',
                fields: {
                    firstName: {
                        type: 'text',
                    },
                },
            })
        )

        await this.setSkillSendMessageWithSchemaAndAssertSystemMessagesEqualExpected(
            buildSchema({
                id: 'another',
                fields: {
                    lastName: {
                        type: 'text',
                    },
                },
            })
        )
    }

    @test()
    protected async sendsExpectedWithState() {
        const schema = buildSchema({
            id: 'next',
            fields: {
                firstName: {
                    type: 'text',
                    isRequired: true,
                },
            },
        })
        const state = {
            firstName: generateId(),
        }
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                state,
                stateSchema: schema,
            },
            [this.renderSchemaMessage(schema), this.renderStateMessage(state)]
        )
    }

    @test()
    protected async sendsExpectedMessageWithSimpleCallback() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                test: {
                    cb: async () => 'hello',
                    useThisWhenever: generateId(),
                },
            }
        )
    }

    @test()
    protected async sendsExectedMessageWithDifferentSimpleCallback() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                aDifferentCallback: {
                    cb: async () => 'hello',
                    useThisWhenever: generateId(),
                },
            }
        )
    }

    @test()
    protected async sendsExpectedMessagesWithMultipleCallbacks() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                a: {
                    cb: async () => 'hello',
                    useThisWhenever: generateId(),
                },
                b: {
                    cb: async () => 'hello',
                    useThisWhenever: generateId(),
                },
            }
        )
    }

    @test()
    protected async sendsExpectedWithCallbackWithParameters() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                a: {
                    cb: async () => `hello`,
                    useThisWhenever: generateId(),
                    parameters: [
                        {
                            name: generateId(),
                            type: generateId(),
                        },
                    ],
                },
            }
        )
    }

    @test()
    protected async sendsExpectedWithCallbackParameterWithDescription() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                callbackOne: {
                    cb: async () => `hello`,
                    useThisWhenever: generateId(),
                    parameters: [
                        {
                            name: generateId(),
                            description: generateId(),
                            type: generateId(),
                        },
                    ],
                },
            }
        )
    }

    @test()
    protected async sendsExpectedWithCallbackParmaterThatIsRequired() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                callbackOne: {
                    cb: async () => `hello`,
                    useThisWhenever: generateId(),
                    parameters: [
                        {
                            name: generateId(),
                            isRequired: true,
                            type: generateId(),
                        },
                    ],
                },
            }
        )
    }

    @test()
    protected async sendsExpectedWithMultipleCallbackParameters() {
        await this.setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
            {
                callbackOne: {
                    cb: async () => `hello`,
                    useThisWhenever: generateId(),
                    parameters: [
                        {
                            name: generateId(),
                            type: generateId(),
                        },
                        {
                            name: generateId(),
                            type: generateId(),
                        },
                    ],
                },
            }
        )
    }

    @test('can set memory limit to 1 via env', 'env')
    @test('can set memory limit to 1 via direct', 'direct')
    protected async chatHistoryCanBeLimitedByEnvTo1(strategy: SetterStrategy) {
        this.setMessageMemoryLimit(1, strategy)

        this.setMessages([
            {
                from: 'Me',
                message: generateId(),
            },
            {
                from: 'You',
                message: 'hello world',
            },
        ])

        await this.sendMessage()

        this.assertLastCompletionEquals([
            {
                role: 'assistant',
                content: 'hello world',
            },
        ])
    }

    @test('can set memory limit to 2 via env', 'env')
    @test('can set memory limit to 2 via direct', 'direct')
    protected async chatHistoryCanBeLimitedByEnvTo2(strategy: SetterStrategy) {
        this.setMessageMemoryLimit(2, strategy)

        this.setMessages([
            {
                from: 'Me',
                message: 'hey there!',
            },
            {
                from: 'You',
                message: 'hello world',
            },
            {
                from: 'Me',
                message: 'another',
            },
        ])

        await this.sendMessage()

        this.assertLastCompletionEquals([
            {
                role: 'assistant',
                content: 'hello world',
            },
            {
                role: 'user',
                content: 'another',
            },
        ])
    }

    @test()
    protected async pleaseKeepInMindIsLast() {
        const callbacks: LlmCallbackMap = {
            test: {
                cb: async () => 'hello',
                useThisWhenever: 'here we go!',
            },
        }

        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                callbacks,
                pleaseKeepInMindThat: ['this is important'],
            },
            [
                this.buildCallbacksMessage(callbacks),
                this.buildPleaseKeepInMindMessage(['this is important']),
            ]
        )
    }

    @test()
    protected async canSendImageAsBase64() {
        const imageMessage: LlmMessage = this.generateImageMessageValues()

        const { message, imageBase64: image } = imageMessage

        this.setMessages([imageMessage])

        await this.sendMessage()
        this.assertLastCompletionEquals([
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: message,
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${image}`,
                        },
                    },
                ],
            },
        ])
    }

    @test()
    protected async messagesAreAlwaysSentAsUser() {
        this.setMessages([
            {
                from: 'Api',
                message: generateId(),
                imageBase64: generateId(),
            },
        ])

        await this.sendMessage()
        const last = this.lastSentCompletion
        assert.isEqual(
            last?.messages[1].role,
            'user',
            'Images can only be sent from user messages.'
        )
    }

    @test()
    protected async rendersSelectOptionsAsExpected() {
        const callbacks: LlmCallbackMap = {
            test: {
                cb: async () => 'hello',
                useThisWhenever: 'here we go!',
                parameters: [
                    {
                        name: 'option',
                        type: 'select',
                        options: {
                            choices: [
                                {
                                    label: 'Option 1',
                                    value: 'option_1',
                                },
                                {
                                    label: 'Option 2',
                                    value: 'option_2',
                                },
                            ],
                        },
                    },
                ],
            },
        }

        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                callbacks,
            },
            [this.buildCallbacksMessage(callbacks)]
        )
    }

    @test()
    protected async rendersDifferentSelectOptionsAsExpected() {
        const callbacks: LlmCallbackMap = {
            test: {
                cb: async () => 'what the',
                useThisWhenever: generateId(),
                parameters: [
                    {
                        name: generateId(),
                        type: 'boolean',
                    },
                    {
                        name: generateId(),
                        type: 'select',
                        options: {
                            choices: [
                                {
                                    label: generateId(),
                                    value: generateId(),
                                },
                                {
                                    label: generateId(),
                                    value: generateId(),
                                },
                                {
                                    label: generateId(),
                                    value: generateId(),
                                },
                            ],
                        },
                    },
                ],
            },
        }

        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                callbacks,
            },
            [this.buildCallbacksMessage(callbacks)]
        )
    }

    @test('can set reasoning effort via env', 'env')
    @test('can set reasoning effort via direct', 'direct')
    protected async canSetReasoningEffortViaEnv(strategy: SetterStrategy) {
        const effort = generateId()

        this.setReasoningEffort(effort, strategy)

        const message = generateId()

        await this.setAndSendMessage(message)

        this.assertLastCompletionEquals([
            {
                role: 'user',
                content: message,
            },
        ])
    }

    @test()
    protected async canTrackMultipleImages() {
        const message1 = this.generateImageMessageValues()
        const message2 = this.generateImageMessageValues()

        this.setMessages([message1, message2])

        await this.sendMessage()

        assert.isEqualDeep(
            this.lastSentCompletion.messages[1],
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: message1.message,
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${message1.imageBase64}`,
                        },
                    },
                ],
            },
            'First image message not correct.'
        )
    }

    @test()
    protected async canBeConfiguredToOnlySendLastImage() {
        process.env.OPENAI_SHOULD_REMEMBER_IMAGES = 'false'

        const message1 = this.generateImageMessageValues()
        const message2 = this.generateImageMessageValues()

        this.setMessages([message1, message2])

        await this.sendMessage()

        assert.isEqualDeep(
            this.lastSentCompletion.messages[1],
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: message1.message,
                    },
                    {
                        type: 'text',
                        text: '[Image omitted to save context]',
                    },
                ],
            },
            'Last image message not correct.'
        )
    }

    @test()
    protected async willOmitImageAfterNextMessageSent() {
        process.env.OPENAI_SHOULD_REMEMBER_IMAGES = 'false'

        const message1 = this.generateImageMessageValues()
        const message2 = this.generateImageMessageValues()
        const message3: LlmMessage = this.generateLlmMessageValues()

        await this.sendMessages([message1, message2, message3])

        assert.isEqualDeep(
            this.lastSentCompletion.messages[2].content?.[1],
            {
                type: 'text',
                text: '[Image omitted to save context]',
            },
            'Image should have been omitted.'
        )
    }

    @test()
    protected async canSetPastMessageLengthLimitViaEnv() {
        this.setMaxChars(100)

        const message1 = this.generateMessageWithLength(140)
        const message2 = this.generateLlmMessageValues()

        await this.sendMessages([message1, message2])

        this.assertMessageAtIndexWasOmittedDueToLength(1)
        this.assertMessageAtIndexWasNotOmitted(2)
    }

    @test()
    protected async maxPastCharsHandlesDifferentMaxChars() {
        this.setMaxChars(75)

        await this.sendMessages([
            this.generateMessageWithLength(100),
            this.generateMessageWithLength(60),
            this.generateMessageWithLength(200),
            this.generateMessageWithLength(70),
        ])

        this.assertMessageAtIndexWasOmittedDueToLength(1)
        this.assertMessageAtIndexWasNotOmitted(2)
        this.assertMessageAtIndexWasOmittedDueToLength(3)
        this.assertMessageAtIndexWasNotOmitted(4)
    }

    @test()
    protected async canSetModelDirectlyOnAdapter() {
        const model = generateId()
        this.openAi.setModel(model)
        await this.sendMessage()
        this.assertModelSentEquals(model)
    }

    private assertModelSentEquals(model: string) {
        assert.isEqual(
            this.lastSentCompletion?.model,
            model,
            'Model not passed as expected'
        )
    }

    private async sendMessages(messages: LlmMessage[]) {
        this.setMessages(messages)
        await this.sendMessage()
    }

    private generateMessageWithLength(length: number) {
        return this.generateLlmMessageValues({
            message: generateBodyOfLength(length),
        })
    }

    private setMaxChars(maxChars: number) {
        process.env.OPENAI_PAST_MESSAGE_MAX_CHARS = maxChars.toString()
        this.resetTrackedMessages()
    }

    private assertMessageAtIndexWasNotOmitted(idx: number) {
        assert.isNotEqual(
            this.getSentMessage(idx)?.content,
            '[omitted due to length]',
            'Recent message was incorrectly omitted.'
        )
    }

    private assertMessageAtIndexWasOmittedDueToLength(idx: number) {
        assert.isEqual(
            this.getSentMessage(idx)?.content,
            '[omitted due to length]',
            'Did not omit long past message.'
        )
    }

    private getSentMessage(idx: number) {
        return this.lastSentCompletion.messages[idx]
    }

    private generateLlmMessageValues(values?: Partial<LlmMessage>): LlmMessage {
        return {
            from: 'Me',
            message: generateId(),
            ...values,
        }
    }

    private get lastSentCompletion() {
        return SpyOpenAiApi.lastSentCompletion!
    }

    private generateImageMessageValues(): LlmMessage {
        return {
            from: 'Me',
            message: generateId(),
            imageBase64: generateId(),
        }
    }

    private buildPleaseKeepInMindMessage(
        pleaseKeepInMind: string[]
    ): OpenAI.Chat.Completions.ChatCompletionMessageParam {
        return {
            role: 'developer',
            content: this.renderPleaseKeepInMind(pleaseKeepInMind),
        }
    }

    private renderPleaseKeepInMind(
        pleaseKeepInMind: string[]
    ): string | OpenAI.Chat.Completions.ChatCompletionContentPartText[] {
        return `During this conversation, please keep the following in mind:\n\n${pleaseKeepInMind.map((m, idx) => `${idx + 1}. ${m}`).join('\n')}.`
    }

    private setMessageMemoryLimit(
        limit: number,
        setterStrategy: SetterStrategy
    ) {
        if (setterStrategy === 'env') {
            process.env.OPENAI_MESSAGE_MEMORY_LIMIT = limit.toString()
        } else if (setterStrategy === 'direct') {
            this.openAi.setMessageMemoryLimit(limit)
        }
    }

    private setReasoningEffort(effort: string, setterStrategy: SetterStrategy) {
        if (setterStrategy === 'env') {
            process.env.OPENAI_REASONING_EFFORT = effort
        } else if (setterStrategy === 'direct') {
            this.reasoningEffort = effort
            this.openAi.setReasoningEffort(effort)
        }
    }

    private async setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
        callbacks: LlmCallbackMap
    ) {
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                callbacks,
            },
            [this.buildCallbacksMessage(callbacks)]
        )
    }

    private buildCallbacksMessage(callbacks: LlmCallbackMap): Message {
        const keys = Object.keys(callbacks)
        const descriptions: string[] = []

        for (const key of keys) {
            const callback = callbacks[key]
            let desc = `
<Function name="${key}">
    <Description>For use when ${callback.useThisWhenever}</Description>`

            if (callback.parameters) {
                desc += `<Parameters>`
                const parameters: string[] = []
                for (const parameter of callback.parameters) {
                    let parameterChoices = ''

                    if (parameter.type === 'select') {
                        const choices = (parameter as SelectFieldDefinition)
                            .options.choices
                        parameterChoices = `<Choices>\n${choices
                            .map(
                                (c) => `
    <Choice>
        <Label>${c.label}</Label>
        <Value>${c.value}</Value>
    </Choice>`
                            )
                            .join('\n')}\n</Choices>`
                    }

                    const parameterDefinition = `
        <Parameter${parameter.isRequired ? ' required="true"' : ''}>
            <Name>${parameter.name}</Name>
            <Type>${parameter.type}</Type>
            ${parameter.description ? `<Description>${parameter.description}</Description>` : ''}${parameterChoices}
        </Parameter>`

                    parameters.push(parameterDefinition)
                }

                desc += parameters.join('\n') + `</Parameters>`
            }
            descriptions.push(
                desc +
                    `
</Function>`
            )
        }

        const api = `<APIReference>\n\n${descriptions.join('\n\n')}</APIReference>`

        const message = `You have an API available to you to lookup answers. When you need the response of the function call to proceed, you can call a function using a custom markup we created that looks like this: <<FunctionName/>>. The API will respond with the results and then you can continue the conversation with your new knowledge. If the api call has parameters, call it like this: <<FunctionName>>{{parametersJsonEncoded}}<</FunctionName>>. Make sure to json encode the data and drop it between the function tags. Note: You can only make one API call at a time. The API is as follows (in xml format):\n\n${api}`
        return { role: 'developer', content: message }
    }

    private renderStateMessage(state: Record<string, any>): Message {
        return {
            role: 'developer',
            content: `The current state of this conversation is:\n\n${JSON.stringify(state)}. As the state is being updated, send it back to me in json format (something in can JSON.parse()) at the end of each response (it's not meant for reading, but for parsing, so don't call it out, but send it as we progress), surrounded by the State Boundary (${STATE_BOUNDARY}), like this:\n\n${STATE_BOUNDARY} { "fieldName": "fieldValue" } ${STATE_BOUNDARY}`,
        }
    }

    private async setSkillSendMessageWithSchemaAndAssertSystemMessagesEqualExpected(
        schema: Schema
    ) {
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                stateSchema: schema,
            },
            [this.renderSchemaMessage(schema), this.renderStateMessage({})]
        )
    }

    private renderSchemaMessage(schema: Schema): Message {
        return {
            role: 'developer',
            content: `We will be tracking state for this conversation. The following schema is what we'll use to define the shape of the state:\n\n${JSON.stringify(schema)}`,
        }
    }

    private async setSkillSendMessageAndAssertSystemMessagesEqual(
        skillOptions: Partial<SkillOptions>,
        messages: Message[]
    ) {
        const skill = this.Skill({
            yourJobIfYouChooseToAcceptItIs: this.skillJob,
            weAreDoneWhen: undefined,
            ...skillOptions,
        })

        this.bot.setSkill(skill)

        const message = generateId()

        await this.setAndSendMessage(message)

        this.assertLastCompletionEquals([
            {
                role: 'developer',
                content: `For this interaction, your job is ${this.skillJob}.`,
            },
            ...messages,
            {
                role: 'user',
                content: message,
            },
        ])
    }

    private assertLastCompletionEquals(expected: Message[]) {
        const params: ChatCompletionCreateParamsNonStreaming = {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'developer',
                    content: `You are ${this.youAre}.`,
                },
                ...expected,
            ],
        }

        const reasoningEffort =
            this.reasoningEffort ?? process.env.OPENAI_REASONING_EFFORT
        if (reasoningEffort) {
            params.reasoning_effort = reasoningEffort as ReasoningEffort
        }

        assert.isEqualDeep(
            this.stripTabsAndNewlinesFromCompletion(this.lastSentCompletion),
            this.stripTabsAndNewlinesFromCompletion(params),
            'Last completion does not match expected.'
        )
    }

    private stripTabsAndNewlinesFromCompletion(
        completion: ChatCompletionCreateParamsNonStreaming
    ) {
        const { messages } = completion
        completion.messages = messages.map((message) => ({
            ...message,
            content:
                typeof message.content === 'string'
                    ? message.content
                          .replace(/\t|\n|/g, '')
                          .replace(/\s+/g, ' ')
                    : message.content,
        })) as ChatCompletionMessageParam[]

        return completion
    }

    private async assertResponseEquals(expected: string) {
        const response = await this.setAndSendMessage()
        assert.isEqual(
            response,
            expected,
            'Response does not match expected value.'
        )
    }

    private async setAndSendMessage(
        message?: string,
        options?: SendMessageOptions
    ) {
        this.setMessages([
            {
                from: 'Me',
                message: message ?? generateId(),
            },
        ])
        return await this.sendMessage(options)
    }

    private setMessages(messages: LlmMessage[]) {
        this.bot.setMessages(messages)
    }

    private async sendMessage(options?: SendMessageOptions) {
        return await this.openAi.sendMessage(this.bot, options)
    }

    private OpenAi(key?: string) {
        return OpenAiAdapter.Adapter(key ?? generateId())
    }

    private setupSpys() {
        OpenAiAdapter.OpenAI = SpyOpenAiApi as any
        this.resetTrackedMessages()
    }

    private resetTrackedMessages() {
        SpyOpenAiApi.lastSentCompletion = undefined
    }
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam

function generateBodyOfLength(length: number): string {
    return 'A'.repeat(length)
}

type SetterStrategy = 'env' | 'direct'
