import { Schema } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import SprucebotLlmBotImpl from '../../bots/SprucebotLlmBotImpl'
import SpruceError from '../../errors/SpruceError'
import {
    LlmCallbackMap,
    MessageResponseCallback,
    SendMessage,
    SkillOptions,
} from '../../llm.types'
import ResponseParser, {
    ParsedResponse,
} from '../../parsingResponses/ResponseParser'
import SpyLlmBot from '../../tests/SpyLlmBot'
import AbstractLlmTest from '../support/AbstractLlmTest'
import { Car, carSchema } from '../support/schemas/carSchema'
import { personSchema } from '../support/schemas/personSchema'
import { personWithDefaultsSchema } from '../support/schemas/personWithDefaultsSchema'

@suite()
export default class LlmBotTest extends AbstractLlmTest {
    private bot!: SpyLlmBot
    private parser!: FakeResponseParser

    protected async beforeEach() {
        await super.beforeEach()
        this.bot = this.Bot({
            stateSchema: personSchema,
        })

        this.parser = new FakeResponseParser()
        ResponseParser.setInstance(this.parser)
    }

    @test()
    protected async throwsWhenSendingBadMessage() {
        //@ts-ignore
        const err = await assert.doesThrowAsync(() => this.bot.sendMessage())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['message'],
        })
    }

    @test()
    protected async sendsItselfToTheLlmAdapter() {
        const message = generateId()
        await this.sendMessage(message)
        assert.isEqual(this.adapter.lastSendMessageBot, this.bot)
    }

    @test()
    protected async serializesAsExpected() {
        const youAre = generateId()

        const state = {
            favoriteColor: 'red',
            firstName: generateId(),
        }

        this.bot = this.Bot({
            youAre,
            stateSchema: personSchema,
            state,
        })

        assert.isEqualDeep(this.bot.serialize(), {
            youAre,
            stateSchema: personSchema,
            state,
            messages: [],
            skill: undefined,
        })
    }

    @test()
    protected async canUpdateState() {
        const newState = {
            favoriteColor: 'blue',
            firstName: generateId(),
        }

        await this.updateState(newState)

        this.assertSerializedStateEquals(newState)
    }

    @test()
    protected async updatingStateMixesIn() {
        const state = {
            make: 'Ford',
        }

        this.bot = this.Bot({
            stateSchema: carSchema,
            state,
        })

        const newState: Partial<Car> = {
            model: 'F-150',
        }

        await this.updateState(newState)

        const expected = {
            ...state,
            ...newState,
        }

        this.assertSerializedStateEquals(expected)
    }

    @test()
    protected async stateHonorsDefaultValues() {
        this.bot = this.Bot({
            stateSchema: personWithDefaultsSchema,
        })

        this.assertSerializedStateEquals({
            firstName: 'John',
            lastName: 'Doe',
        })
    }

    @test()
    protected async updatingStateEmitsDidUpdateState() {
        let wasHit = false
        await this.bot.on('did-update-state', () => {
            wasHit = true
        })

        await this.updateState({
            favoriteColor: 'blue',
        })

        assert.isTrue(
            wasHit,
            'did-update-state should have been hit when updating state'
        )
    }

    @test()
    protected async settingBadStateSendsResponseBackToAdapter() {
        this.parser.response = {
            message: generateId(),
            state: {
                hello: 'world',
            },
        }

        await this.sendMessage(generateId())
    }

    @test()
    protected async knowsWhenDone() {
        this.assertBotIsNotDone()
        this.bot.markAsDone()
        this.assertBotIsDone()
    }

    @test()
    protected async sendMessageReturnsResponseFromAdapter() {
        this.adapter.lastSendMessageResponse = generateId()
        const message = generateId()
        const response = await this.sendMessage(message)
        assert.isEqual(
            response,
            this.adapter.lastSendMessageResponse,
            'response returned from send message does not match what was returned from adapter'
        )
    }

    @test()
    protected async tracksMessageHistory() {
        const message = generateId()
        this.adapter.lastSendMessageResponse = generateId()
        await this.sendMessage(message)
        const { messages } = this.bot.serialize()
        assert.isEqualDeep(messages, [
            {
                from: 'Me',
                message,
            },
            {
                from: 'You',
                message: this.adapter.lastSendMessageResponse,
            },
        ])
    }

    @test()
    protected async trackedMessageUsesResponseFromAdapterNotParser() {
        this.adapter.shouldRandomizeResponseMessage = false

        this.setupBotWithSkill({
            callbacks: {
                helloWorld: {
                    cb: () => 'Hello, World!',
                    useThisWhenever: 'Hello, World!',
                },
            },
        })

        this.adapter.lastSendMessageResponse =
            'should use this response to track message history'
        this.parser.response.message = generateId()
        await this.sendMessage(generateId())
        const { messages } = this.bot.serialize()

        assert.isEqual(
            messages[1].message,
            'should use this response to track message history'
        )
    }

    @test()
    protected async isDoneWhenParsesSaysSo() {
        this.setParserResponseIsDone(true)
        await this.sendMessage(generateId())
        this.assertBotIsDone()
    }

    @test()
    protected async notDoneUntilDone() {
        this.setParserResponseIsDone(false)
        await this.sendMessage(generateId())
        this.assertBotIsNotDone()
    }

    @test()
    protected async botActuallySendsResponseToParser() {
        this.adapter.lastSendMessageResponse = generateId()
        await this.sendMessage(generateId())
        assert.isEqual(
            this.parser.lastMessage,
            this.adapter.lastSendMessageResponse,
            'parser did not receive message from adapter'
        )
    }

    @test()
    protected async enheritesStateSchemaFromSkillWhenSerializing() {
        this.setupBotWithSkill({
            stateSchema: personSchema,
        })

        const { stateSchema } = this.serialize()
        assert.isEqualDeep(
            stateSchema,
            personSchema,
            'state schema did not match from serialization'
        )
    }

    @test('inherits state from skill when serializing', {
        favoriteColor: 'blue',
    })
    @test('inherits state from skill when serializing 2', {
        firstName: generateId(),
    })
    protected async inheritsStateFromSkillWhenSerializing(
        skillState: Record<string, any>
    ) {
        this.setupBotWithSkill({
            stateSchema: personSchema,
            state: skillState,
        })

        this.assertSerializedStateEquals(skillState)
    }

    @test('inherits state from bot when parsing response', {
        favoriteColor: 'red',
    })
    @test('inherits state from bot when parsing response 2', {
        firstName: generateId(),
    })
    protected async stateIsSentBackToBotWhenParsing(
        state: Record<string, any>
    ) {
        this.bot = this.Bot({
            stateSchema: personSchema,
        })

        await this.sendMessageWithResponseState(state)

        this.assertSerializedStateEquals(state)
    }

    @test()
    protected async emitsDidUpdateStateWhenStateIsUpdated() {
        this.bot = this.Bot({
            stateSchema: personSchema,
        })

        let wasHit = false
        await this.bot.on('did-update-state', () => {
            wasHit = true
        })

        await this.sendMessageWithResponseState({
            favoriteColor: 'blue',
        })

        assert.isTrue(wasHit)
    }

    @test()
    protected async shouldNotEmitUpdateItNoStatePassed() {
        let wasHit = false
        await this.bot.on('did-update-state', () => {
            wasHit = true
        })

        await this.sendRandomMessage()
        assert.isFalse(wasHit)
    }

    @test('sets state in response to skill if skill has state 1', {
        favoriteColor: 'blue',
    })
    @test('sets state in response to skill if skill has state 2', {
        firstName: generateId(),
    })
    protected async setsStateInResponseToSkillIfSkillHasState(
        state: Record<string, any>
    ) {
        const skill = this.setupBotWithSkill({
            stateSchema: personSchema,
        })

        await this.sendMessageWithResponseState(state)
        assert.isEqualDeep(
            skill.serialize().state,
            state,
            'state in skill did not match state sent in response'
        )
        assert.isUndefined(this.bot.getState(), 'state should not be on bot')
    }

    @test('responds on skill if state does not match schema 1', 'skill')
    @test('responds on bot if state does not match schema 2', 'bot')
    protected async updatingStateThrowsIfStateDoesNotMatchSchema(
        skillOrBot: 'skill' | 'bot'
    ) {
        this.setupWithStateSchema(skillOrBot, personSchema)

        const message =
            await this.sendMessageWithBadStateResponseAndGetErrorSentToAdapter({
                test: true,
            })

        assert.isEqual(
            message.from,
            'Api',
            'Schema error response should be from Api'
        )

        assert.doesInclude(message.message, '`test` does not exist')
    }

    @test(
        'responds with validation error if parameter is wrong type on skill',
        'skill'
    )
    @test(
        'responds with validation error if parameter is wrong type on bot',
        'bot'
    )
    protected async throwsWithInvalidParameter(skillOrBot: 'skill' | 'bot') {
        this.setupWithStateSchema(skillOrBot, carSchema)

        const msg =
            await this.sendMessageWithBadStateResponseAndGetErrorSentToAdapter({
                year: 'hello world',
            })

        assert.isEqual(
            msg.from,
            'Api',
            'Schema error response should be from Api'
        )

        assert.doesInclude(
            msg.message,
            `""hello world"" is not a number!`,
            'Error message should include details about invalid parameter'
        )
    }

    @test()
    protected async doesntEmitDidChangeOnSkillIfStateIsNotOnSkill() {
        const skill = this.setupBotWithSkill({})

        let wasHit = false
        await skill.on('did-update-state', () => {
            wasHit = true
        })

        await this.sendRandomMessage()

        assert.isFalse(wasHit)
    }

    @test()
    protected async passesCallbacksToParserOnResponse() {
        const callbacks = {
            foo: {
                cb: () => 'hey',
                useThisWhenever: 'hey',
            },
        }
        this.setupBotWithSkill({
            callbacks,
        })

        await this.sendRandomMessage()
        assert.isEqual(
            this.parser.lastCallbacks,
            callbacks,
            'did not pass callbacks to parser'
        )
    }

    @test()
    protected async canSwapSkillMidWayThrough() {
        this.setupBotWithSkill({})
        const skill2 = this.Skill()
        this.bot.setSkill(skill2)
        assert.isEqual(this.bot.getSkill(), skill2)
    }

    @test()
    protected async defaultLimitsMessagesTo10() {
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(2)
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(4)
        await this.sendRandomMessage()
        await this.sendRandomMessage()
        await this.sendRandomMessage()
        const body = await this.sendRandomMessage()
        this.assertTotalMessagesTracked(10)
        assert.doesInclude(this.messages, { message: body })
    }

    @test()
    protected async canSetMemory() {
        SprucebotLlmBotImpl.messageMemoryLimit = 5
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(2)
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(4)
        await this.sendRandomMessage()
        await this.sendRandomMessage()
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(5)
    }

    @test()
    protected async settingSkillToBotSetsToNotDone() {
        this.bot.markAsDone()
        this.bot.setSkill(this.Skill())
        assert.isFalse(this.bot.getIsDone())
    }

    @test()
    protected async canClearMessageHistory() {
        await this.sendRandomMessage()
        this.bot.clearMessageHistory()
        assert.isLength(this.messages, 0)
    }

    @test()
    protected async botRespondingCallsMessageCallback() {
        this.setParserResponseMessage()
        let passedMessage: string | undefined
        await this.sendMessage(generateId(), (message) => {
            passedMessage = message
        })
        assert.isEqual(passedMessage, this.parserResponse)
    }

    @test()
    protected async messageCallbackFiredAfterAllMessagesTracked() {
        await this.sendMessage(generateId(), () => {
            this.assertTotalMessagesTracked(2)
        })
    }

    @test()
    protected async ifParserRespondsWithCallbackResultsTheyAreSentImmediately() {
        const functionCallResponse = generateId()
        const response1 = generateId()
        const response2 = generateId()

        this.adapter.shouldRandomizeResponseMessage = false
        this.adapter.lastSendMessageResponse = response1
        this.setParserResponseCallbackResults(functionCallResponse)

        let passedMessages: string[] = []
        const message = await this.sendRandomMessage((message) => {
            passedMessages.push(message)
            this.setParserResponseCallbackResults(undefined)
            this.adapter.lastSendMessageResponse = response2
        })

        assert.isEqualDeep(this.messages, [
            {
                from: 'Me',
                message,
            },
            {
                from: 'You',
                message: response1,
            },
            {
                from: 'Api',
                message: `API Results: ${functionCallResponse}`,
            },
            {
                from: 'You',
                message: response2,
            },
        ])

        assert.isEqualDeep(
            passedMessages,
            [response1, response2],
            'Messages passed to callback do not match'
        )
    }

    @test()
    protected async handleParserRespondingWithImage() {
        const base64Image = generateId()
        const description = generateId()
        const functionResponse: SendMessage = {
            imageBase64: base64Image,
            imageDescription: description,
        }
        this.setParserResponseCallbackResults(functionResponse)
        await this.sendRandomMessage(() => {
            this.setParserResponseCallbackResults(undefined)
        })

        assert.isEqualDeep(this.messages[2], {
            from: 'Api',
            message: `API Results: ${description}`,
            imageBase64: base64Image,
        })
    }

    @test()
    protected async sendsMessageBackToBotIfParserThrows() {
        const passedMessages: string[] = []
        const error = generateId()
        const parserResponse = generateId()
        this.setParserResponseMessage(parserResponse)
        this.parser.invalidParseErrorOnNextParse = error
        await this.sendMessage(generateId(), (message) => {
            passedMessages.push(message)
        })
        assert.isEqual(this.messages[2].message, 'Error: ' + error)
        assert.isEqualDeep(passedMessages, [parserResponse])
    }

    @test()
    protected async sendsMessageBackToBotIfCallbackThrows() {
        const passedMessages: string[] = []
        const error = generateId()
        const parserResponse = generateId()
        this.setParserResponseMessage(parserResponse)
        this.parser.callbackErrorOnNextParse = error
        await this.sendMessage(generateId(), (message) => {
            passedMessages.push(message)
        })
        assert.isEqual(
            this.messages[2].message,
            'Error: The callback threw an error! Please check the details and try again.'
        )
        assert.isEqualDeep(passedMessages, [parserResponse])
    }

    @test()
    protected async responseThatThrowsIsStillTracked() {
        this.adapter.shouldRandomizeResponseMessage = false
        const error = generateId()
        this.adapter.lastSendMessageResponse = generateId()
        this.parser.invalidParseErrorOnNextParse = error
        const initialMessage = generateId()
        await this.sendMessage(initialMessage)

        assert.isEqualDeep(
            this.messages,
            [
                {
                    from: 'Me',
                    message: initialMessage,
                },
                {
                    from: 'You',
                    message: this.adapter.lastSendMessageResponse,
                },
                {
                    from: 'Api',
                    message: 'Error: ' + error,
                },
                {
                    from: 'You',
                    message: this.adapter.lastSendMessageResponse,
                },
            ],
            'Messages'
        )
    }

    @test()
    protected async canSendImage() {
        const base64 = generateId()
        const description = generateId()

        await this.sendMessage({
            imageBase64: base64,
            imageDescription: description,
        })

        assert.isEqualDeep(
            this.messages[0],
            {
                from: 'Me',
                message: description,
                imageBase64: base64,
            },
            `the initial message did not contain an image`
        )
    }

    @test()
    protected async secondMessageSendingAfterFirstCausesFirstsResponseToBeIgnored() {
        this.adapter.lastSendMessageResponse = generateId()
        this.adapter.responseDelayMs = 10

        const promise = this.sendMessage('hey there!')
        await this.sendMessage('dear sir')
        await promise

        assert.isEqualDeep(
            this.messages,
            [
                {
                    from: 'Me',
                    message: 'hey there!',
                },
                {
                    from: 'Me',
                    message: 'dear sir',
                },
                {
                    from: 'You',
                    message: this.adapter.lastSendMessageResponse,
                },
            ],
            'only the second response should be recorded'
        )
    }

    @test()
    protected async stateUpdatesAreNormalized() {
        this.bot = this.Bot({
            stateSchema: personSchema,
        })

        await this.updateState({
            nickNames: 'bob',
        })

        const expected = {
            nickNames: ['bob'],
        }

        this.assertSerializedStateEquals(expected)
    }

    private setupWithStateSchema(skillOrBot: string, schema: Schema) {
        if (skillOrBot === 'skill') {
            this.setupBotWithSkill({
                stateSchema: schema,
            })
        } else {
            this.bot = this.Bot({
                stateSchema: schema,
            })
        }
    }

    private setParserResponseCallbackResults(results?: SendMessage) {
        this.parser.response.callbackResults = results
    }

    private get parserResponse(): string | undefined {
        return this.parser.response.message
    }

    private setParserResponseMessage(message?: string) {
        this.parser.response.message = message ?? generateId()
    }

    private setParserResponseIsDone(isDone: boolean) {
        this.parser.response.isDone = isDone
    }

    private assertTotalMessagesTracked(expected: number) {
        assert.isLength(this.messages, expected)
    }

    private async sendMessageWithBadStateResponseAndGetErrorSentToAdapter(
        updates: Record<string, any>
    ) {
        await this.sendMessageWithResponseState(updates)
        const lastMessage = this.messages[this.messages.length - 2]
        return lastMessage
    }

    private get messages() {
        return this.bot.getMessages()
    }

    private setupBotWithSkill(options: Partial<SkillOptions>) {
        const skill = this.Skill(options)

        this.bot = this.Bot({
            skill,
        })

        return skill
    }

    private assertBotIsDone() {
        assert.isTrue(this.bot.getIsDone(), 'should be done')
    }

    private assertBotIsNotDone() {
        assert.isFalse(this.bot.getIsDone(), 'should not be done')
    }

    private async sendMessageWithResponseState(state: Record<string, any>) {
        this.setStateInResponse(state)
        await this.sendRandomMessage()
    }

    private async sendRandomMessage(cb?: MessageResponseCallback) {
        const body = generateId()
        await this.sendMessage(body, cb)
        return body
    }

    private setStateInResponse(state: Record<string, any>) {
        this.parser.response.state = state
    }

    private async sendMessage(
        message: SendMessage,
        cb?: MessageResponseCallback
    ) {
        return await this.bot.sendMessage(message, cb)
    }

    private serialize() {
        return this.bot.serialize()
    }

    private async updateState(updates: Record<string, any>) {
        await this.bot.updateState(updates)
    }

    private assertSerializedStateEquals(expected?: Record<string, any>) {
        assert.isEqualDeep(
            this.bot.serialize().state,
            expected,
            'Serialized state does not match expected'
        )
    }
}

class FakeResponseParser extends ResponseParser {
    public response: Partial<ParsedResponse> = {
        isDone: false,
        state: undefined,
    }
    public lastMessage?: string
    public lastCallbacks?: LlmCallbackMap
    public invalidParseErrorOnNextParse?: string
    public callbackErrorOnNextParse?: string

    public async parse(
        message: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        if (this.invalidParseErrorOnNextParse) {
            const invalidParse = this.invalidParseErrorOnNextParse
            delete this.invalidParseErrorOnNextParse
            throw new SpruceError({
                code: 'INVALID_CALLBACK',
                matchedCallback: generateId(),
                validCallbacks: [],
                friendlyMessage: invalidParse,
            })
        }

        if (this.callbackErrorOnNextParse) {
            delete this.callbackErrorOnNextParse
            throw new SpruceError({
                code: 'CALLBACK_ERROR',
            })
        }

        this.lastMessage = message
        this.lastCallbacks = callbacks

        const results = {
            message,
            isDone: false,
            ...this.response,
        }

        delete this.response.state

        return results as ParsedResponse
    }
}
