import { test, suite, assert } from '@sprucelabs/test-utils'
import LlmAdapterLoaderImpl from '../../../bots/adapters/LlmAdapterLoader'
import MockAdapterLoader from '../../../tests/MockAdapterLoader'
import SpyLlmAdapter from '../../../tests/SpyAdapter'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class TestingLlmAdapterLoaderTest extends AbstractLlmTest {
    protected async beforeEach(): Promise<void> {
        await super.beforeEach()
        process.env.SPRUCE_LLM_ADAPTER = 'openai'
        LlmAdapterLoaderImpl.Class = MockAdapterLoader
        MockAdapterLoader.reset()
    }

    @test()
    protected async setsInstanceOnMockAdapterLoader() {
        this.assertWasNotCreated()
        LlmAdapterLoaderImpl.Loader()
        MockAdapterLoader.assertWasCreated()
    }

    @test()
    protected async mockInstanceReset() {
        this.assertWasNotCreated()
    }

    @test()
    protected async returnsSpyAdapterByDefault() {
        const adapter = this.Adapter()
        assert.isInstanceOf(
            adapter,
            SpyLlmAdapter,
            'Expected the default adapter to be SpyLlmAdapter'
        )
    }

    @test()
    protected async canGetLastAdapter() {
        const adapter = this.Adapter()
        const lastAdapter = MockAdapterLoader.instance.lastAdapter
        assert.isEqual(
            adapter,
            lastAdapter,
            'Expected to get the last adapter created'
        )
    }

    private Adapter() {
        return LlmAdapterLoaderImpl.Loader().Adapter()
    }
    private assertWasNotCreated() {
        assert.doesThrow(() => MockAdapterLoader.assertWasCreated())
    }
}
