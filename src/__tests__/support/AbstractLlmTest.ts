import { Schema } from '@sprucelabs/schema'
import AbstractSpruceTest, { generateId } from '@sprucelabs/test-utils'
import SprucebotLlmFactory from '../../bots/SprucebotLlmFactory'
import { BotOptions, SkillOptions } from '../../llm.types'
import SpyLlmAdapter from '../../tests/SpyAdapter'
import SpyLlmBot from '../../tests/SpyLlmBot'

export default abstract class AbstractLlmTest extends AbstractSpruceTest {
    protected bots!: SprucebotLlmFactory
    protected adapter!: SpyLlmAdapter
    protected youAre!: string

    protected async beforeEach() {
        await super.beforeEach()

        this.youAre = generateId()
        this.adapter = new SpyLlmAdapter()
        this.bots = SprucebotLlmFactory.Factory(this.adapter)

        SprucebotLlmFactory.reset()
    }

    protected Bot<S extends Schema>(options?: Partial<BotOptions<S>>): SpyLlmBot {
        return this.bots.Bot({
            youAre: this.youAre,
            Class: SpyLlmBot,
            ...options,
        }) as SpyLlmBot
    }

    protected Skill(options?: Partial<SkillOptions>) {
        return this.bots.Skill({
            weAreDoneWhen: generateId(),
            yourJobIfYouChooseToAcceptItIs: generateId(),
            ...options,
        })
    }
}
