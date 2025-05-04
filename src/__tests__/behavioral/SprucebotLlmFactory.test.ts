import { test, suite, assert, errorAssert } from '@sprucelabs/test-utils'
import SprucebotLlmBotImpl from '../../bots/SprucebotLlmBotImpl'
import SprucebotLlmFactory from '../../bots/SprucebotLlmFactory'
import SprucebotLlmSkillImpl from '../../bots/SprucebotLlmSkillImpl'
import { SprucebotLlmBot } from '../../llm.types'
import SpyLlmBot from '../../tests/SpyLlmBot'
import AbstractLlmTest from '../support/AbstractLlmTest'

@suite()
export default class SprucebotLlmFactoryTest extends AbstractLlmTest {
    @test()
    protected async canGetInstance() {
        //@ts-ignore
        assert.isInstanceOf(this.bots, SprucebotLlmFactory)
    }

    @test()
    protected async factoryMethodThrowsWithMissing() {
        //@ts-ignore
        const err = assert.doesThrow(() => SprucebotLlmFactory.Factory())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['adapter'],
        })
    }

    @test()
    protected async throwsWhenMissingBotOptions() {
        //@ts-ignore
        const err = assert.doesThrow(() => this.bots.Bot())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['youAre'],
        })
    }

    @test()
    protected async canGetBot() {
        const bot = this.Bot()
        this.assertInstanceOfBot(bot)
    }

    @test()
    protected cantGetInstanceUntilOneIsSet() {
        const err = assert.doesThrow(() => this.bots.getBotInstance())
        errorAssert.assertError(err, 'NO_BOT_INSTANCE_SET')
    }

    @test()
    protected async canGetBotInstance() {
        this.setInstance()
        this.bots.getBotInstance()
    }

    @test()
    protected getInstanceReturnsBot() {
        const bot = this.setInstance()
        assert.isEqual(this.bots.getBotInstance(), bot)
    }

    @test()
    protected async canSetTheFactoryClass() {
        SprucebotLlmFactory.FactoryClass = SpyFactory
        const factory = SprucebotLlmFactory.Factory(this.adapter)
        //@ts-ignore
        assert.isInstanceOf(factory, SpyFactory)
    }

    @test()
    protected async canSetBotClass() {
        SprucebotLlmFactory.BotClass = SpyLlmBot

        const bot = this.bots.Bot({
            youAre: 'a bot',
        })

        assert.isInstanceOf(bot, SpyLlmBot)
    }

    @test()
    protected async canSetSkillClass() {
        SprucebotLlmFactory.SkillClass = SpySkill

        const skill = this.bots.Skill({
            yourJobIfYouChooseToAcceptItIs: 'aoeu',
        })

        assert.isInstanceOf(skill, SpySkill)
    }

    @test()
    protected async resettingFactoryClassResetsClasses() {
        SprucebotLlmFactory.BotClass = SpyLlmBot
        SprucebotLlmFactory.FactoryClass = SpyFactory
        SprucebotLlmFactory.SkillClass = SpySkill
        SprucebotLlmFactory.reset()
        assert.isFalsy(SprucebotLlmFactory.BotClass)
        assert.isFalsy(SprucebotLlmFactory.FactoryClass)
        assert.isFalsy(SprucebotLlmFactory.SkillClass)
    }

    private setInstance() {
        const bot = this.Bot()
        this.bots.setBotInstance(bot)
        return bot
    }

    private assertInstanceOfBot(bot: SprucebotLlmBot) {
        assert.isInstanceOf(bot, SprucebotLlmBotImpl)
    }
}

class SpyFactory extends SprucebotLlmFactory {}
class SpySkill extends SprucebotLlmSkillImpl {}
