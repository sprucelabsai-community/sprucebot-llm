import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import { SkillOptions } from '../../llm.types'
import AbstractLlmTest from '../support/AbstractLlmTest'
import { Car, carSchema } from '../support/schemas/carSchema'
import { personSchema } from '../support/schemas/personSchema'
import { personWithDefaultsSchema } from '../support/schemas/personWithDefaultsSchema'
import { SpyBot } from '../support/SpyBot'
import ResponseParser, { ParsedResponse } from './prompts/ResponseParser'

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
		this.parser.response.isDone = true
		await this.sendMessage(generateId())
		assert.isTrue(this.bot.getIsDone())
	}

	@test()
	protected static async notDoneUntilDone() {
		this.parser.response.isDone = false
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
	protected static async tracksTheResponseWithTokensRemoved() {
		this.parser.response.message = generateId()

		const message = generateId()
		const response = await this.sendMessage(message)

		assert.isEqualDeep(this.bot.getMessages(), [
			{
				from: 'Me',
				message,
			},
			{
				from: 'You',
				message: this.parser.response.message,
			},
		])

		assert.isEqual(response, this.parser.response.message)
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

	private static setupBotWithSkill(options: Partial<SkillOptions>) {
		const skill = this.Skill(options)

		this.bot = this.Bot({
			skill,
		})

		return skill
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

	private static async sendMessageWithResponseState(
		state: Record<string, any>
	) {
		this.setStateInResponse(state)
		await this.sendRandomMessage()
	}

	private static async sendRandomMessage() {
		await this.sendMessage(generateId())
	}

	private static setStateInResponse(state: Record<string, any>) {
		this.parser.response.state = state
	}

	private static async sendMessage(message: string) {
		return await this.bot.sendMessage(message)
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
	public async parse(message: string): Promise<ParsedResponse> {
		this.lastMessage = message
		return {
			message,
			isDone: false,
			...this.response,
		}
	}
}
