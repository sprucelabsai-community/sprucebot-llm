import { test, suite, assert, generateId } from '@sprucelabs/test-utils'
import SpyLlmAdapter from '../../../tests/SpyAdapter'
import SpyLlmBot from '../../../tests/SpyLlmBot'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class SpyLlmBotTest extends AbstractLlmTest {
    @test()
    protected async spyBotInstanceSetToLastIntsance() {
        const options = {
            adapter: new SpyLlmAdapter(),
            youAre: generateId(),
        }
        const spyLlmBot = new SpyLlmBot(options)
        assert.isEqual(SpyLlmBot.instance, spyLlmBot)
        assert.isEqual(SpyLlmBot.instance.constructorOptions, options)
    }
}
