import { test, assert, errorAssert } from '@sprucelabs/test-utils'
import SprucebotLlmBotImpl from '../../bots/SprucebotLlmBotImpl'
import SprucebotLlmFactory from '../../bots/SprucebotLlmFactory'
import { SprucebotLlmBot } from '../../llm.types'
import AbstractLlmTest from '../support/AbstractLlmTest'

export default class SprucebotLlmFactoryTest extends AbstractLlmTest {
	@test()
	protected static async canGetInstance() {
		assert.isInstanceOf(this.bots, SprucebotLlmFactory)
	}

	@test()
	protected static async throwsWhenMissingBotOptions() {
		//@ts-ignore
		const err = assert.doesThrow(() => this.bots.Bot())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['youAre', 'adapter'],
		})
	}

	@test()
	protected static async canGetBot() {
		const bot = this.Bot()
		this.assertInstanceOfBot(bot)
	}

	@test()
	protected static cantGetInstanceUntilOneIsSet() {
		const err = assert.doesThrow(() => this.bots.getBotInstance())
		errorAssert.assertError(err, 'NO_BOT_INSTANCE_SET')
	}

	@test()
	protected static async canGetBotInstance() {
		this.setInstance()
		this.bots.getBotInstance()
	}

	@test()
	protected static getInstanceReturnsBot() {
		const bot = this.setInstance()
		assert.isEqual(this.bots.getBotInstance(), bot)
	}

	private static setInstance() {
		const bot = this.Bot()
		this.bots.setBotInstance(bot)
		return bot
	}

	private static assertInstanceOfBot(bot: SprucebotLlmBot) {
		assert.isInstanceOf(bot, SprucebotLlmBotImpl)
	}
}
