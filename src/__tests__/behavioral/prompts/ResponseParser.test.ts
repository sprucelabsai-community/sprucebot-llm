import { test, assert } from '@sprucelabs/test-utils'
import { DONE_TOKEN } from '../../../bots/PromptGenerator'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import ResponseParser, { ParsedResponse } from './ResponseParser'

export default class ResponseParserTest extends AbstractLlmTest {
	private static parser: ResponseParser
	protected static async beforeEach() {
		await super.beforeEach()
		this.parser = new ResponseParser()
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

	private static assertDone(message: string) {
		this.parsingEquals(message, {
			isDone: true,
			state: undefined,
		})
	}

	private static assertNotDone(message: string) {
		this.parsingEquals(message, {
			isDone: false,
			state: undefined,
		})
	}

	private static parsingEquals(message: string, expected: ParsedResponse) {
		const results = this.parser.parse(message)
		assert.isEqualDeep(results, expected)
	}
}
