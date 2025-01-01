import { Schema } from '@sprucelabs/schema'
import AbstractSpruceTest, { generateId } from '@sprucelabs/test-utils'
import SprucebotLlmFactory from '../../bots/SprucebotLlmFactory'
import { BotOptions, SkillOptions } from '../../llm.types'
import SpyAdapter from './SpyAdapter'
import { SpyBot } from './SpyBot'

export default abstract class AbstractLlmTest extends AbstractSpruceTest {
    protected static bots: SprucebotLlmFactory
    protected static adapter: SpyAdapter
    protected static youAre: string

    protected static async beforeEach() {
        await super.beforeEach()

        this.youAre = generateId()
        this.adapter = new SpyAdapter()
        this.bots = SprucebotLlmFactory.Factory()

        SprucebotLlmFactory.reset()
    }

    protected static Bot<S extends Schema>(
        options?: Partial<BotOptions<S>>
    ): SpyBot {
        return this.bots.Bot({
            youAre: this.youAre,
            adapter: this.adapter,
            Class: SpyBot,
            ...options,
        }) as SpyBot
    }

    protected static Skill(options?: Partial<SkillOptions>) {
        return this.bots.Skill({
            weAreDoneWhen: generateId(),
            yourJobIfYouChooseToAcceptItIs: generateId(),
            ...options,
        })
    }
}
