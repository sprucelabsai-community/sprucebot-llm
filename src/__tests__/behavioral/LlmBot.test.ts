import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import SprucebotLlmBotImpl from '../../bots/SprucebotLlmBotImpl'
import {
    LlmCallbackMap,
    MessageResponseCallback,
    SkillOptions,
} from '../../llm.types'
import ResponseParser, {
    ParsedResponse,
} from '../../parsingResponses/ResponseParser'
import AbstractLlmTest from '../support/AbstractLlmTest'
import { Car, carSchema } from '../support/schemas/carSchema'
import { personSchema } from '../support/schemas/personSchema'
import { personWithDefaultsSchema } from '../support/schemas/personWithDefaultsSchema'
import { SpyBot } from '../support/SpyBot'

export default class LlmBotTest extends AbstractLlmTest {
    private static bot: SpyBot
    private static parser: FakeResponseParser

    protected static async beforeEach() {
        await super.beforeEach()
        this.bot = this.Bot({
            stateSchema: personSchema,
        })

        this.parser = new FakeResponseParser()
        ResponseParser.setInstance(this.parser)
    }

    @test()
    protected static async throwsWhenSendingBadMessage() {
        //@ts-ignore
        const err = await assert.doesThrowAsync(() => this.bot.sendMessage())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['message'],
        })
    }

    @test()
    protected static async sendsItselfToTheLlmAdapter() {
        const message = generateId()
        await this.sendMessage(message)
        assert.isEqual(this.adapter.lastBot, this.bot)
    }

    @test()
    protected static async serializesAsExpected() {
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
    protected static async canUpdateState() {
        const newState = {
            favoriteColor: 'blue',
            firstName: generateId(),
        }

        await this.updateState(newState)

        this.assertSerializedStateEquals(newState)
    }

    @test()
    protected static async updatingStateMixesIn() {
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
    protected static async stateHonorsDefaultValues() {
        this.bot = this.Bot({
            stateSchema: personWithDefaultsSchema,
        })

        this.assertSerializedStateEquals({
            firstName: 'John',
            lastName: 'Doe',
        })
    }

    @test()
    protected static async updatingStateEmitsDidUpdateState() {
        let wasHit = false
        await this.bot.on('did-update-state', () => {
            wasHit = true
        })

        await this.updateState({
            favoriteColor: 'blue',
        })

        assert.isTrue(wasHit)
    }

    @test()
    protected static async knowsWhenDone() {
        assert.isFalse(this.bot.getIsDone())
        this.bot.markAsDone()
        assert.isTrue(this.bot.getIsDone())
    }

    @test()
    protected static async sendMessageReturnsResponseFromAdapter() {
        this.adapter.messageResponse = generateId()
        const message = generateId()
        const response = await this.sendMessage(message)
        assert.isEqual(response, this.adapter.messageResponse)
    }

    @test()
    protected static async tracksMessageHistory() {
        const message = generateId()
        this.adapter.messageResponse = generateId()
        await this.sendMessage(message)
        const { messages } = this.bot.serialize()
        assert.isEqualDeep(messages, [
            {
                from: 'Me',
                message,
            },
            {
                from: 'You',
                message: this.adapter.messageResponse,
            },
        ])
    }

    @test()
    protected static async isDoneWhenParsesSaysSo() {
        this.setParserResponseIsDone(true)
        await this.sendMessage(generateId())
        assert.isTrue(this.bot.getIsDone())
    }

    @test()
    protected static async notDoneUntilDone() {
        this.setParserResponseIsDone(false)
        await this.sendMessage(generateId())
        assert.isFalse(this.bot.getIsDone())
    }

    @test()
    protected static async botActuallySendsResponseToParser() {
        this.adapter.messageResponse = generateId()
        await this.sendMessage(generateId())
        assert.isEqual(this.parser.lastMessage, this.adapter.messageResponse)
    }

    @test()
    protected static async returnsTheResponseFromTheParser() {
        this.setParserResponseMessage()

        const message = generateId()
        const response = await this.sendMessage(message)

        assert.isEqualDeep(this.bot.getMessages(), [
            {
                from: 'Me',
                message,
            },
            {
                from: 'You',
                message: this.parserResponse,
            },
        ])

        assert.isEqual(response, this.parserResponse)
    }

    @test()
    protected static async enheritesStateSchemaFromSkillWhenSerializing() {
        this.setupBotWithSkill({
            stateSchema: personSchema,
        })

        const { stateSchema } = this.serialize()
        assert.isEqualDeep(stateSchema, personSchema)
    }

    @test('inherits state from skill when serializing', {
        favoriteColor: 'blue',
    })
    @test('inherits state from skill when serializing 2', {
        firstName: generateId(),
    })
    protected static async inheritsStateFromSkillWhenSerializing(
        skillState: Record<string, any>
    ) {
        this.setupBotWithSkill({
            stateSchema: personSchema,
            state: skillState,
        })

        const { state } = this.bot.serialize()
        assert.isEqualDeep(state, skillState)
    }

    @test('inherits state from bot when parsing response', {
        favoriteColor: 'red',
    })
    @test('inherits state from bot when parsing response 2', {
        firstName: generateId(),
    })
    protected static async stateIsSentBackToBotWhenParsing(
        state: Record<string, any>
    ) {
        this.bot = this.Bot({
            stateSchema: personSchema,
        })

        await this.sendMessageWithResponseState(state)

        this.assertSerializedStateEquals(state)
    }

    @test()
    protected static async emitsDidUpdateStateWhenStateIsUpdated() {
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
    protected static async shouldNotEmitUpdateItNoStatePassed() {
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
    protected static async setsStateInResponseToSkillIfSkillHasState(
        state: Record<string, any>
    ) {
        const skill = this.setupBotWithSkill({
            stateSchema: personSchema,
        })

        await this.sendMessageWithResponseState(state)
        assert.isEqualDeep(skill.serialize().state, state)
        assert.isUndefined(this.bot.getState())
    }

    @test()
    protected static async doesntEmitDidChangeOnSkillIfStateIsNotOnSkill() {
        const skill = this.setupBotWithSkill({})

        let wasHit = false
        await skill.on('did-update-state', () => {
            wasHit = true
        })

        await this.sendRandomMessage()

        assert.isFalse(wasHit)
    }

    @test()
    protected static async passesCallbacksToParserOnResponse() {
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
        assert.isEqual(this.parser.lastCallbacks, callbacks)
    }

    @test()
    protected static async canSwapSkillMidWayThrough() {
        this.setupBotWithSkill({})
        const skill2 = this.Skill()
        this.bot.setSkill(skill2)
        assert.isEqual(this.bot.getSkill(), skill2)
    }

    @test()
    protected static async defaultLimitsMessagesTo10() {
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(2)
        await this.sendRandomMessage()
        this.assertTotalMessagesTracked(4)
        await this.sendRandomMessage()
        await this.sendRandomMessage()
        await this.sendRandomMessage()
        const body = await this.sendRandomMessage()
        this.assertTotalMessagesTracked(10)
        assert.doesInclude(this.bot.getMessages(), { message: body })
    }

    @test()
    protected static async canSetMemory() {
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
    protected static async settingSkillToBotSetsToNotDone() {
        this.bot.markAsDone()
        this.bot.setSkill(this.Skill())
        assert.isFalse(this.bot.getIsDone())
    }

    @test()
    protected static async canClearMessageHistory() {
        await this.sendRandomMessage()
        this.bot.clearMessageHistory()
        assert.isLength(this.bot.getMessages(), 0)
    }

    @test()
    protected static async botRespondingCallsMessageCallback() {
        this.setParserResponseMessage()
        let passedMessage: string | undefined
        await this.sendMessage(generateId(), (message) => {
            passedMessage = message
        })
        assert.isEqual(passedMessage, this.parserResponse)
    }

    @test()
    protected static async messageCallbackFiredAfterAllMessagesTracked() {
        await this.sendMessage(generateId(), () => {
            this.assertTotalMessagesTracked(2)
        })
    }

    @test()
    protected static async ifParserRespondsWithCallbackResultsTheyAreSentImmediately() {
        const functionCallResponse = generateId()
        const response1 = generateId()
        const response2 = generateId()

        this.setParserResponseMessage(response1)
        this.setParserResponseCallbackResults(functionCallResponse)

        let passedMessages: string[] = []
        const message = await this.sendRandomMessage((message) => {
            passedMessages.push(message)
            this.setParserResponseCallbackResults(undefined)
            this.setParserResponseMessage(response2)
        })

        assert.isEqualDeep(this.bot.getMessages(), [
            {
                from: 'Me',
                message,
            },
            {
                from: 'You',
                message: response1,
            },
            {
                from: 'Me',
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

    private static setParserResponseCallbackResults(
        results: string | undefined
    ) {
        this.parser.response.callbackResults = results
    }

    private static get parserResponse(): string | undefined {
        return this.parser.response.message
    }

    private static setParserResponseMessage(message?: string) {
        this.parser.response.message = message ?? generateId()
    }

    private static setParserResponseIsDone(isDone: boolean) {
        this.parser.response.isDone = isDone
    }

    private static assertTotalMessagesTracked(expected: number) {
        assert.isLength(this.bot.getMessages(), expected)
    }

    private static setupBotWithSkill(options: Partial<SkillOptions>) {
        const skill = this.Skill(options)

        this.bot = this.Bot({
            skill,
        })

        return skill
    }

    private static async sendMessageWithResponseState(
        state: Record<string, any>
    ) {
        this.setStateInResponse(state)
        await this.sendRandomMessage()
    }

    private static async sendRandomMessage(cb?: MessageResponseCallback) {
        const body = generateId()
        await this.sendMessage(body, cb)
        return body
    }

    private static setStateInResponse(state: Record<string, any>) {
        this.parser.response.state = state
    }

    private static async sendMessage(
        message: string,
        cb?: MessageResponseCallback
    ) {
        return await this.bot.sendMessage(message, cb)
    }

    private static serialize() {
        return this.bot.serialize()
    }

    private static async updateState(updates: Record<string, any>) {
        await this.bot.updateState(updates)
    }

    private static assertSerializedStateEquals(expected?: Record<string, any>) {
        assert.isEqualDeep(this.bot.serialize().state, expected)
    }
}

class FakeResponseParser extends ResponseParser {
    public response: Partial<ParsedResponse> = {
        isDone: false,
        state: undefined,
    }
    public lastMessage?: string
    public lastCallbacks?: LlmCallbackMap

    public async parse(
        message: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        this.lastMessage = message
        this.lastCallbacks = callbacks
        return {
            message,
            isDone: false,
            ...this.response,
        }
    }
}
