import { test, assert } from '@sprucelabs/test-utils'
import { DONE_TOKEN, STATE_BOUNDARY } from '../../../bots/PromptGenerator'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import ResponseParser, { ParsedResponse } from './ResponseParser'

export default class ResponseParserTest extends AbstractLlmTest {
	private static parser: ResponseParser
	protected static async beforeEach() {
		await super.beforeEach()
		this.parser = ResponseParser.getInstance()
	}

	@test()
	protected static async canSetAndGetInstance() {
		ResponseParser.setInstance(this.parser)
		const match = ResponseParser.getInstance()
		assert.isEqual(match, this.parser)
	}

	@test()
	protected static async emptyReturnedIfResponseHasNoPlaceholders() {
		this.assertNotDone('hello world')
		this.assertNotDone('DONE')
	}

	@test()
	protected static async knowsWhenDone() {
		this.assertDone(`hey there!!! ${DONE_TOKEN}`)
	}

	@test()
	protected static async gettingInstanceWithoutOneSetReturnsFresh() {
		const instance = ResponseParser.getInstance()
		assert.isInstanceOf(instance, ResponseParser)
		const instance2 = ResponseParser.getInstance()
		assert.isEqual(instance, instance2)
	}

	@test('parses state 1', {
		hello: 'world',
	})
	@test('parses state 2', {
		what: 'the??',
	})
	protected static async parsesStateWithNothingElse(
		input: Record<string, any>
	) {
		const state = this.generateStateSchema(input)
		this.parsingEquals(state, {
			isDone: false,
			state: input,
			message: '',
		})
	}

	@test()
	protected static async removesStateFromResponse() {
		const state = this.generateStateSchema({ hello: 'world' })
		const message = `hello ${state} world`
		this.parsingEquals(message, {
			isDone: false,
			state: { hello: 'world' },
			message: 'hello  world',
		})
	}

	private static generateStateSchema(input: Record<string, any>) {
		return `${STATE_BOUNDARY} ${JSON.stringify(input)} ${STATE_BOUNDARY}`
	}

	private static assertDone(message: string) {
		this.parsingEquals(message, {
			isDone: true,
			state: undefined,
			message: removeTokens(message),
		})
	}

	private static assertNotDone(message: string) {
		this.parsingEquals(message, {
			isDone: false,
			state: undefined,
			message: removeTokens(message),
		})
	}

	private static parsingEquals(message: string, expected: ParsedResponse) {
		const results = this.parser.parse(message)
		assert.isEqualDeep(results, expected)
	}
}
function removeTokens(message: string): string {
	return message.replace(DONE_TOKEN, '').trim()
}
