import { buildSchema, Schema } from '@sprucelabs/schema'
import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import OpenAI from 'openai'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources'
import {
    MESSAGE_RESPONSE_ERROR_MESSAGE,
    OpenAiAdapter,
} from '../../../bots/adapters/OpenAi'
import SpyOpenAiApi from '../../../bots/adapters/SpyOpenAiApi'
import { DONE_TOKEN, STATE_BOUNDARY } from '../../../bots/templates'
import {
    LlmCallbackMap,
    SendMessageOptions,
    SkillOptions,
} from '../../../llm.types'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { SpyBot } from '../../support/SpyBot'

export default class OpenAiTest extends AbstractLlmTest {
    private static openAi: OpenAiAdapter
    private static bot: SpyBot
    private static skillJob: string

    protected static async beforeAll(): Promise<void> {
        await super.beforeAll()
        assert.isEqual(OpenAiAdapter.OpenAI, OpenAI, 'OpenAI not set')
    }

    protected static async beforeEach() {
        await super.beforeEach()

        this.skillJob = generateId()

        this.setupSpys()
        this.openAi = this.OpenAi()
        this.bot = this.Bot()

        delete process.env.OPENAI_CHAT_HISTORY_LIMIT
    }

    @test()
    protected static async throwsWhenMissingKey() {
        //@ts-ignore
        const err = assert.doesThrow(() => new OpenAiAdapter())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['apiKey'],
        })
    }

    @test()
    protected static async instantiatingOpenAiSetsKeyToConfig() {
        const key = generateId()
        this.OpenAi(key)
        assert.isEqual(SpyOpenAiApi.config?.apiKey, key)
    }

    @test()
    protected static async canSendMessage() {
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
    protected static async returnsResponseFromSendMessage() {
        SpyOpenAiApi.responseMessage = generateId()
        await this.assertResponseEquals(SpyOpenAiApi.responseMessage)
    }

    @test()
    protected static async trimsResponseMessage() {
        SpyOpenAiApi.responseMessage = ' hello world '
        await this.assertResponseEquals('hello world')
    }

    @test()
    protected static async noResponseReturnsDefaultErrorMesssage() {
        SpyOpenAiApi.responseMessage = false
        await this.assertResponseEquals(MESSAGE_RESPONSE_ERROR_MESSAGE)
    }

    @test()
    protected static async sendMessageCanAcceptModel() {
        const model =
            'davinci:ft-personal:sprucebot-concierge-2023-04-28-04-42-19'

        await this.setAndSendMessage(generateId(), {
            model,
        })

        assert.isEqual(SpyOpenAiApi.lastSentCompletion?.model, model)
    }

    @test()
    protected static async sendsAllMessagesToOpenAi() {
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
    protected static async sendsExpectedMessageIfSkillIsPassedWithJustJustJob() {
        await this.setSkillSendMessageAndAssertSystemMessagesEqual({}, [])
    }

    @test()
    protected static async sendsExpectedMessageIfSkillPassedWithWhenWeAreDone() {
        const doneWhen = generateId()
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                weAreDoneWhen: doneWhen,
            },
            [
                {
                    role: 'system',
                    content: `Our conversation is done when ${doneWhen}. Once you determine we are done, send me the following message so I know we're done: ${DONE_TOKEN}`,
                },
            ]
        )
    }

    @test()
    protected static async sendsExpectedWithOnePleaseKeepInMind() {
        const pleaseKeepInMind = [generateId()]
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                pleaseKeepInMindThat: pleaseKeepInMind,
            },
            [this.buildPleaseKeepInMindMessage(pleaseKeepInMind)]
        )
    }

    @test()
    protected static async sendsExpectedWithMultiplePleaseKeepInMind() {
        const pleaseKeepInMind = [generateId(), generateId()]
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                pleaseKeepInMindThat: pleaseKeepInMind,
            },
            [
                {
                    role: 'system',
                    content: `During this conversation, please keep the following in mind:\n\n1. ${pleaseKeepInMind[0]}\n2. ${pleaseKeepInMind[1]}.`,
                },
            ]
        )
    }

    @test()
    protected static async sendsExpectedWithSchema() {
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
    protected static async sendsExpectedWithState() {
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
    protected static async sendsExpectedMessageWithSimpleCallback() {
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
    protected static async sendsExectedMessageWithDifferentSimpleCallback() {
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
    protected static async sendsExpectedMessagesWithMultipleCallbacks() {
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
    protected static async sendsExpectedWithCallbackWithParameters() {
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
    protected static async sendsExpectedWithCallbackParameterWithDescription() {
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
    protected static async sendsExpectedWithCallbackParmaterThatIsRequired() {
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
    protected static async sendsExpectedWithMultipleCallbackParameters() {
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

    @test()
    protected static async chatHistoryCanBeLimitedByEnvTo1() {
        this.setMessageMemoryLimit('1')

        this.bot.setMessages([
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

    @test()
    protected static async chatHistoryCanBeLimitedByEnvTo2() {
        this.setMessageMemoryLimit('2')

        this.bot.setMessages([
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
    protected static async pleaseKeepInMindIsLast() {
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

    private static buildPleaseKeepInMindMessage(
        pleaseKeepInMind: string[]
    ): OpenAI.Chat.Completions.ChatCompletionMessageParam {
        return {
            role: 'system',
            content: this.renderPleaseKeepInMind(pleaseKeepInMind),
        }
    }

    private static renderPleaseKeepInMind(
        pleaseKeepInMind: string[]
    ): string | OpenAI.Chat.Completions.ChatCompletionContentPartText[] {
        return `During this conversation, please keep the following in mind:\n\n${pleaseKeepInMind.map((m, idx) => `${idx + 1}. ${m}`).join('\n')}.`
    }

    private static setMessageMemoryLimit(limit: string) {
        process.env.OPENAI_MESSAGE_MEMORY_LIMIT = limit
    }

    private static async setSkillSendMessageWithCallbacksAndAssertSystemMessagesEqualExpected(
        callbacks: LlmCallbackMap
    ) {
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                callbacks,
            },
            [this.buildCallbacksMessage(callbacks)]
        )
    }

    private static buildCallbacksMessage(callbacks: LlmCallbackMap): Message {
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
                    parameters.push(
                        `
        <Parameter${parameter.isRequired ? ' required="true"' : ''}>
            <Name>${parameter.name}</Name>
            <Type>${parameter.type}</Type>
            ${parameter.description ? `<Description>${parameter.description}</Description>` : ''}
        </Parameter>`
                    )
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

        const message = `You have an API available to you to lookup answers. When you need the response of the function call to proceed, you can call a function using a custom markup we created that looks like this: << FunctionName />>. The API will respond with the results and then you can continue the conversation with your new knowledge. If the api call has parameters, call it like this: << FunctionName >>parameters json encoded<</ FunctionName >>. Make sure to json encode the data and drop it between the function tags. I will respond with the api's response and you can use it going forward. The api is as follows (in xml format):\n\n${api}`
        return { role: 'system', content: message }
    }

    private static renderStateMessage(state: Record<string, any>): Message {
        return {
            role: 'system',
            content: `The current state of this conversation is:\n\n${JSON.stringify(state)}. As the state is being updated, send it back to me in json format (something in can JSON.parse()) at the end of each response (it's not meant for reading, but for parsing, so don't call it out, but send it as we progress), surrounded by a boundary, like this: ${STATE_BOUNDARY} { "fieldName": "fieldValue" } ${STATE_BOUNDARY}`,
        }
    }

    private static async setSkillSendMessageWithSchemaAndAssertSystemMessagesEqualExpected(
        schema: Schema
    ) {
        await this.setSkillSendMessageAndAssertSystemMessagesEqual(
            {
                stateSchema: schema,
            },
            [this.renderSchemaMessage(schema), this.renderStateMessage({})]
        )
    }

    private static renderSchemaMessage(schema: Schema): Message {
        return {
            role: 'system',
            content: `We will be tracking state for this conversation. The following schema is what we'll use to define the shape of the state:\n\n${JSON.stringify(schema)}`,
        }
    }

    private static async setSkillSendMessageAndAssertSystemMessagesEqual(
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
                role: 'system',
                content: `For this interaction, your job is ${this.skillJob}.`,
            },
            ...messages,
            {
                role: 'user',
                content: message,
            },
        ])
    }

    private static assertLastCompletionEquals(expected: Message[]) {
        assert.isEqualDeep(
            this.stripTabsAndNewlinesFromCompletion(
                SpyOpenAiApi.lastSentCompletion!
            ),
            this.stripTabsAndNewlinesFromCompletion({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are ${this.youAre}.`,
                    },
                    ...expected,
                ],
            })
        )
    }

    private static stripTabsAndNewlinesFromCompletion(
        completion: ChatCompletionCreateParamsNonStreaming
    ) {
        const { messages } = completion
        completion.messages = messages.map((message) => ({
            ...message,
            content: (message.content as string)
                .replace(/\t|\n|/g, '')
                .replace(/\s+/g, ' '),
        }))

        return completion
    }

    private static async assertResponseEquals(expected: string) {
        const response = await this.setAndSendMessage()
        assert.isEqual(response, expected)
    }

    private static async setAndSendMessage(
        message?: string,
        options?: SendMessageOptions
    ) {
        this.bot.setMessages([
            {
                from: 'Me',
                message: message ?? generateId(),
            },
        ])
        return await this.sendMessage(options)
    }

    private static async sendMessage(options?: SendMessageOptions) {
        return await this.openAi.sendMessage(this.bot, options)
    }

    private static OpenAi(key?: string) {
        return OpenAiAdapter.Adapter(key ?? generateId())
    }

    private static setupSpys() {
        OpenAiAdapter.OpenAI = SpyOpenAiApi as any
        SpyOpenAiApi.lastSentCompletion = undefined
    }
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
