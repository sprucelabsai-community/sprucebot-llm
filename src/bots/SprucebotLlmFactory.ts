import { assertOptions } from '@sprucelabs/schema'
import SpruceError from '../errors/SpruceError'
import {
	BotOptions,
	SkillOptions,
	SprucebotLlmBot,
	SprucebotLLmSkill,
} from '../llm.types'
import SprucebotLlmBotImpl from './SprucebotLlmBotImpl'
import SprucebotLlmSkillImpl from './SprucebotLlmSkillImpl'

export default class SprucebotLlmFactory {
	private instance?: SprucebotLlmBot

	public Bot(options: BotOptions): SprucebotLlmBot {
		assertOptions(options, ['youAre', 'adapter'])

		const { Class } = options

		return Class ? new Class(options) : new SprucebotLlmBotImpl(options)
	}

	public Skill(options: SkillOptions): SprucebotLLmSkill {
		assertOptions(options, ['yourJobIfYouChooseToAcceptItIs', 'weAreDoneWhen'])
		return new SprucebotLlmSkillImpl(options)
	}

	public getBotInstance() {
		if (!this.instance) {
			throw new SpruceError({
				code: 'NO_BOT_INSTANCE_SET',
			})
		}
		return this.instance
	}

	public setBotInstance(bot: SprucebotLlmBot) {
		this.instance = bot
	}

	public static Factory(): SprucebotLlmFactory {
		return new this()
	}
}
