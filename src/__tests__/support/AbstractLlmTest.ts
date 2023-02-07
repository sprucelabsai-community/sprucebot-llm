import { Schema } from '@sprucelabs/schema'
import AbstractSpruceTest from '@sprucelabs/test-utils'
import SprucebotLlmFactory from '../../bots/SprucebotLlmFactory'
import { BotOptions } from '../../llm.types'
import SpyAdapter from './SpyAdapter'
import { SpyBot } from './SpyBot'

export default abstract class AbstractLlmTest extends AbstractSpruceTest {
	protected static bots: SprucebotLlmFactory
	protected static adapter: SpyAdapter

	protected static async beforeEach() {
		await super.beforeEach()
		this.adapter = new SpyAdapter()
		this.bots = SprucebotLlmFactory.Factory()
	}

	protected static Bot<S extends Schema>(
		options?: Partial<BotOptions<S>>
	): SpyBot {
		return this.bots.Bot({
			youAre: 'a bot',
			adapter: this.adapter,
			Class: SpyBot,
			...options,
		}) as SpyBot
	}
}
