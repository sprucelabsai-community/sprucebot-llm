import { Schema } from '@sprucelabs/schema'
import AbstractSpruceTest, { generateId } from '@sprucelabs/test-utils'
import SprucebotLlmFactory from '../../bots/SprucebotLlmFactory'
import { BotOptions, SkillOptions } from '../../llm.types'
import SpyAdapter from './SpyAdapter'
import { SpyBot } from './SpyBot'

export default abstract class AbstractLlmTest extends AbstractSpruceTest {
    protected bots!: SprucebotLlmFactory
    protected adapter!: SpyAdapter
    protected youAre!: string

    protected async beforeEach() {
        await super.beforeEach()

        this.youAre = generateId()
        this.adapter = new SpyAdapter()
        this.bots = SprucebotLlmFactory.Factory(this.adapter)

        SprucebotLlmFactory.reset()
    }

    protected Bot<S extends Schema>(options?: Partial<BotOptions<S>>): SpyBot {
        return this.bots.Bot({
            youAre: this.youAre,
            Class: SpyBot,
            ...options,
        }) as SpyBot
    }

    protected Skill(options?: Partial<SkillOptions>) {
        return this.bots.Skill({
            weAreDoneWhen: generateId(),
            yourJobIfYouChooseToAcceptItIs: generateId(),
            ...options,
        })
    }
}
