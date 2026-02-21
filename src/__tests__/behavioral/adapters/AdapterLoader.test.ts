import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import AnthropicAdapter, {
    AnthropicAdapterOptions,
} from '../../../bots/adapters/AnthropicAdapter'
import LlmAdapterLoaderImpl from '../../../bots/adapters/LlmAdapterLoader'
import OllamaAdapter, {
    OllamaAdapterOptions,
} from '../../../bots/adapters/OllamaAdapter'
import OpenAiAdapter, {
    OpenAiAdapterOptions,
} from '../../../bots/adapters/OpenAiAdapter'
import { LllmReasoningEffort } from '../../../llm.types'
import SpyLlmAdapter from '../../../tests/SpyAdapter'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class AdapterLoaderTest extends AbstractLlmTest {
    protected async beforeEach(): Promise<void> {
        await super.beforeEach()

        process.env.SPRUCE_LLM_API_KEY = generateId()
        process.env.SPRUCE_LLM_MEMORY_LIMIT = `${Math.floor(Math.random() * 1000)}`
        process.env.SPRUCE_LLM_MODEL = generateId()
        process.env.SPRUCE_LLM_REASONING_EFFORT = generateId()
        process.env.SPRUCE_LLM_MAX_TOKENS = `${Math.floor(Math.random() * 1000)}`
        process.env.SPRUCE_LLM_THINKING = 'true'
        process.env.SPRUCE_LLM_BASE_URL = generateId()

        OpenAiAdapter.Class = SpyLlmAdapter
        AnthropicAdapter.Class = SpyLlmAdapter
        OllamaAdapter.Class = SpyLlmAdapter
    }

    @test()
    protected async throwsIfEnvNotSet() {
        const err = this.assertLoaderThrows()
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['env.SPRUCE_LLM_ADAPTER'],
        })
    }

    @test('can create with OpenAi', 'OpenAi')
    @test('can create with Anthropic', 'Anthropic')
    @test('can create with Ollama', 'Ollama')
    @test('can create with lowercase name', 'openai')
    protected async canCreateWithEnv(name: string) {
        this.setLlmAdapter(name)
        this.Loader()
    }

    @test()
    protected async throwsWithInvalidAdapterName() {
        this.setLlmAdapter(generateId())
        const err = this.assertLoaderThrows()
        errorAssert.assertError(err, 'INVALID_LLM_ADAPTER', {
            adapter: process.env.SPRUCE_LLM_ADAPTER,
        })
    }

    @test()
    protected async returnsAnInstanceOfTheAdapter() {
        delete OpenAiAdapter.Class
        const adapter = this.Adapter('OpenAi')
        assert.isInstanceOf(
            adapter,
            //@ts-ignore
            OpenAiAdapter,
            'Loader should return an instance of OpenAiAdapter'
        )
    }

    @test('passes through api key to OpenAi', 'OpenAi')
    @test('passes through api key to Anthropic', 'Anthropic')
    protected async passesApiKeyToTheAdapter(name: string) {
        const adapter = this.Adapter(name)
        assert.isEqual(
            adapter.apiKey,
            process.env.SPRUCE_LLM_API_KEY,
            'API key not passed to adapter'
        )
    }

    @test()
    protected async passesThroughOptionsToTheOpenAiAdapter() {
        const expected: OpenAiAdapterOptions = {
            memoryLimit: parseInt(process.env.SPRUCE_LLM_MEMORY_LIMIT!, 10),
            model: process.env.SPRUCE_LLM_MODEL,
            reasoningEffort: process.env
                .SPRUCE_LLM_REASONING_EFFORT as LllmReasoningEffort,
            baseUrl: process.env.SPRUCE_LLM_BASE_URL,
        }

        const adapter = this.Adapter('OpenAi')
        delete adapter.constructorOptions?.log

        assert.isEqualDeep(
            adapter.constructorOptions,
            expected,
            'Options not passed correctly to adapter'
        )
    }

    @test('anthropic gets expected options with thinking true', 'true')
    @test('anthropic gets expected options with thinking false', 'false')
    protected async passesThroughOptionsToTheAnthropicAdapter(value: string) {
        process.env.SPRUCE_LLM_THINKING = value
        const expected: AnthropicAdapterOptions = {
            baseUrl: process.env.SPRUCE_LLM_BASE_URL,
            maxTokens: parseInt(process.env.SPRUCE_LLM_MAX_TOKENS!, 10),
            memoryLimit: parseInt(process.env.SPRUCE_LLM_MEMORY_LIMIT!, 10),
            thinking: process.env.SPRUCE_LLM_THINKING === 'true',
            model: process.env.SPRUCE_LLM_MODEL,
        }

        const adapter = this.Adapter('Anthropic')

        delete adapter.constructorOptions?.log

        assert.isEqualDeep(
            adapter.constructorOptions,
            expected,
            'Options not passed correctly to adapter'
        )
    }

    @test()
    protected async doesNotPassMemoryLimitIfNotSetToOpenAi() {
        delete process.env.SPRUCE_LLM_MEMORY_LIMIT
        const adapter = this.Adapter('OpenAi')

        assert.isUndefined(
            adapter.constructorOptions?.memoryLimit,
            'Memory limit should not be passed if not set'
        )
    }

    @test()
    protected async canLoadAnthropicKey() {
        delete AnthropicAdapter.Class

        const adapter = this.Adapter('Anthropic')
        assert.isInstanceOf(
            adapter,
            //@ts-ignore
            AnthropicAdapter,
            'Loader should return an instance of AnthropicAdapter'
        )
    }

    @test()
    protected async anthropicThrowsWithoutMaxTokens() {
        delete process.env.SPRUCE_LLM_MAX_TOKENS
        this.setLlmAdapter('Anthropic')
        const err = this.assertLoaderThrows()
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['env.SPRUCE_LLM_MAX_TOKENS'],
        })
    }

    @test()
    protected async canLoadOllammAdapter() {
        delete OllamaAdapter.Class

        const adapter = this.Adapter('Ollama')
        assert.isInstanceOf(
            adapter,
            //@ts-ignore
            OllamaAdapter,
            'Loader should return an instance of OllamaAdapter'
        )
    }

    @test('passes through options to OllamaAdapter with think true', 'true')
    @test('passes through options to OllamaAdapter with think false', 'false')
    protected async passesThroughOptionsToOllamaAdapter(think: string) {
        process.env.SPRUCE_LLM_THINKING = think
        const expected: OllamaAdapterOptions = {
            baseUrl: process.env.SPRUCE_LLM_BASE_URL,
            model: process.env.SPRUCE_LLM_MODEL,
            think: process.env.SPRUCE_LLM_THINKING === 'true',
            memoryLimit: parseInt(process.env.SPRUCE_LLM_MEMORY_LIMIT!, 10),
        }

        const adapter = this.Adapter('Ollama')

        delete adapter.constructorOptions?.log

        assert.isEqualDeep(
            adapter.constructorOptions,
            expected,
            'Options not passed correctly to adapter'
        )
    }

    private Adapter(name: string) {
        this.setLlmAdapter(name)
        const loader = this.Loader()
        const adapter = loader.Adapter()
        return adapter as SpyLlmAdapter
    }

    private setLlmAdapter(name: string) {
        process.env.SPRUCE_LLM_ADAPTER = name
    }

    private assertLoaderThrows() {
        return assert.doesThrow(() => LlmAdapterLoaderImpl.Loader())
    }

    private Loader() {
        return LlmAdapterLoaderImpl.Loader()
    }
}
