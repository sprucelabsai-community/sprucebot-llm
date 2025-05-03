import { buildSchema, Schema } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
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

@suite()
export default class OpenAiTest extends AbstractLlmTest {
    private openAi!: OpenAiAdapter
    private bot!: SpyBot
    private skillJob!: string

    protected static async beforeAll(): Promise<void> {
        await super.beforeAll()
        assert.isEqual(OpenAiAdapter.OpenAI, OpenAI, 'OpenAI not set')
    }

    protected async beforeEach() {
        await super.beforeEach()

        this.skillJob = generateId()

        this.setupSpys()
        this.openAi = this.OpenAi()
        this.bot = this.Bot()

        delete process.env.OPENAI_CHAT_HISTORY_LIMIT
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

        assert.isEqual(SpyOpenAiApi.lastSentCompletion?.model, model)
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
                    role: 'system',
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
                    role: 'system',
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

    @test()
    protected async chatHistoryCanBeLimitedByEnvTo1() {
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
    protected async chatHistoryCanBeLimitedByEnvTo2() {
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

    private buildPleaseKeepInMindMessage(
        pleaseKeepInMind: string[]
    ): OpenAI.Chat.Completions.ChatCompletionMessageParam {
        return {
            role: 'system',
            content: this.renderPleaseKeepInMind(pleaseKeepInMind),
        }
    }

    private renderPleaseKeepInMind(
        pleaseKeepInMind: string[]
    ): string | OpenAI.Chat.Completions.ChatCompletionContentPartText[] {
        return `During this conversation, please keep the following in mind:\n\n${pleaseKeepInMind.map((m, idx) => `${idx + 1}. ${m}`).join('\n')}.`
    }

    private setMessageMemoryLimit(limit: string) {
        process.env.OPENAI_MESSAGE_MEMORY_LIMIT = limit
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

    private renderStateMessage(state: Record<string, any>): Message {
        return {
            role: 'system',
            content: `The current state of this conversation is:\n\n${JSON.stringify(state)}. As the state is being updated, send it back to me in json format (something in can JSON.parse()) at the end of each response (it's not meant for reading, but for parsing, so don't call it out, but send it as we progress), surrounded by a boundary, like this: ${STATE_BOUNDARY} { "fieldName": "fieldValue" } ${STATE_BOUNDARY}`,
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
            role: 'system',
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

    private assertLastCompletionEquals(expected: Message[]) {
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

    private stripTabsAndNewlinesFromCompletion(
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

    private async assertResponseEquals(expected: string) {
        const response = await this.setAndSendMessage()
        assert.isEqual(response, expected)
    }

    private async setAndSendMessage(
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

    private async sendMessage(options?: SendMessageOptions) {
        return await this.openAi.sendMessage(this.bot, options)
    }

    private OpenAi(key?: string) {
        return OpenAiAdapter.Adapter(key ?? generateId())
    }

    private setupSpys() {
        OpenAiAdapter.OpenAI = SpyOpenAiApi as any
        SpyOpenAiApi.lastSentCompletion = undefined
    }
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
