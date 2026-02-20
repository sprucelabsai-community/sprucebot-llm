import { assert } from '@sprucelabs/test-utils'
import { LlmAdapterLoader } from '../bots/adapters/LlmAdapterLoader'
import { LlmAdapter } from '../llm.types'
import SpyLlmAdapter from './SpyAdapter'

export default class MockAdapterLoader implements LlmAdapterLoader {
    public static instance: MockAdapterLoader
    public lastAdapter?: LlmAdapter

    public constructor() {
        MockAdapterLoader.instance = this
    }

    public static assertWasCreated() {
        assert.isTruthy(
            this.instance,
            'Did not create an instance of LlmAdapterLoader using LllmAdapterLoaderImpl.Loader()'
        )
    }

    public Adapter(): LlmAdapter {
        this.lastAdapter = new SpyLlmAdapter('***')
        return this.lastAdapter
    }

    public static reset() {
        //@ts-ignore
        this.instance = undefined
    }
}
