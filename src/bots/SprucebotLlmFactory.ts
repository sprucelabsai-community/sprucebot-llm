import { assertOptions } from '@sprucelabs/schema'
import SpruceError from '../errors/SpruceError'
import {
    BotOptions,
    LlmAdapter,
    SkillOptions,
    SprucebotLlmBot,
    SprucebotLLmSkill,
} from '../llm.types'
import SprucebotLlmBotImpl from './SprucebotLlmBotImpl'
import SprucebotLlmSkillImpl from './SprucebotLlmSkillImpl'

export default class SprucebotLlmFactory {
    protected adapter: LlmAdapter

    private instance?: SprucebotLlmBot

    public static FactoryClass?: typeof SprucebotLlmFactory
    public static BotClass?: new (options: any) => SprucebotLlmBot
    public static SkillClass?: new (options: any) => SprucebotLLmSkill

    protected constructor(adapter: LlmAdapter) {
        this.adapter = adapter
    }

    public Bot(options: Omit<BotOptions, 'adapter'>): SprucebotLlmBot {
        assertOptions(options, ['youAre'])

        const { Class } = options

        return new (Class ??
            SprucebotLlmFactory.BotClass ??
            SprucebotLlmBotImpl)({ ...options, adapter: this.adapter })
    }

    public Skill(options: SkillOptions): SprucebotLLmSkill {
        assertOptions(options, ['yourJobIfYouChooseToAcceptItIs'])
        return new (SprucebotLlmFactory.SkillClass ?? SprucebotLlmSkillImpl)({
            ...options,
        })
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

    public static Factory(adapter: LlmAdapter): SprucebotLlmFactory {
        assertOptions({ adapter }, ['adapter'])
        return new (this.FactoryClass ?? this)(adapter)
    }

    public static reset() {
        this.BotClass = undefined
        this.FactoryClass = undefined
        this.SkillClass = undefined
    }
}
