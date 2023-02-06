import { assertOptions } from '@sprucelabs/schema'
import SpruceError from '../errors/SpruceError'
import { BotOptions, SprucebotLlmBot } from '../llm.types'
import SprucebotLlmBotImpl from './SprucebotLlmBotImpl'

export default class SprucebotLlmFactory {
	private instance?: SprucebotLlmBot

	public Bot(options: BotOptions): SprucebotLlmBot {
		assertOptions(options, ['youAre', 'adapter'])
		return new SprucebotLlmBotImpl(options)
	}

	public getInstance() {
		if (!this.instance) {
			throw new SpruceError({
				code: 'NO_BOT_INSTANCE_SET',
			})
		}
		return this.instance
	}

	public setInstance(bot: SprucebotLlmBot) {
		this.instance = bot
	}

	public static Factory(): SprucebotLlmFactory {
		return new this()
	}
}
