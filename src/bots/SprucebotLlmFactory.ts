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
	public static FactoryClass?: typeof SprucebotLlmFactory
	public static BotClass?: new (options: any) => SprucebotLlmBot

	public Bot(options: BotOptions): SprucebotLlmBot {
		assertOptions(options, ['youAre', 'adapter'])

		const { Class } = options

		return new (Class ?? SprucebotLlmFactory.BotClass ?? SprucebotLlmBotImpl)(
			options
		)
	}

	public Skill(options: SkillOptions): SprucebotLLmSkill {
		assertOptions(options, ['yourJobIfYouChooseToAcceptItIs'])
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
		return new (this.FactoryClass ?? this)()
	}
}
