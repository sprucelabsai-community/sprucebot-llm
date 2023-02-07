import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import { SprucebotLlmBot } from '../../llm.types'
import AbstractLlmTest from '../support/AbstractLlmTest'
import { Car, carSchema } from '../support/schemas/carSchema'
import { personSchema } from '../support/schemas/personSchema'
import { personWithDefaultsSchema } from '../support/schemas/personWithDefaultsSchema'

export default class LlmBotTest extends AbstractLlmTest {
	private static bot: SprucebotLlmBot

	protected static async beforeEach() {
		await super.beforeEach()
		this.bot = this.Bot({
			stateSchema: personSchema,
		})
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
		assert.isEqual(this.adapter.lastMessage, message)
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
		})
	}

	@test()
	protected static async canUpdateState() {
		const newState = {
			favoriteColor: 'blue',
			firstName: generateId(),
		}

		await this.updateState(newState)

		this.assertStateEquals(newState)
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

		this.assertStateEquals(expected)
	}

	@test()
	protected static async stateHonorsDefaultValues() {
		this.bot = this.Bot({
			stateSchema: personWithDefaultsSchema,
		})

		this.assertStateEquals({
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

	private static async sendMessage(message: string) {
		return await this.bot.sendMessage(message)
	}

	private static async updateState(updates: Record<string, any>) {
		await this.bot.updateState(updates)
	}

	private static assertStateEquals(expected: Record<string, any>) {
		assert.isEqualDeep(this.bot.serialize().state, expected)
	}
}
