import { assertOptions } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import AnthropicAdapter from '../../../bots/adapters/AnthropicAdapter'
import OpenAiAdapter, {
    OpenAiAdapterOptions,
} from '../../../bots/adapters/OpenAiAdapter'
import SpruceError from '../../../errors/SpruceError'
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

        OpenAiAdapter.Class = SpyLlmAdapter
        AnthropicAdapter.Class = SpyLlmAdapter
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

    @test()
    protected async passesApiKeyToTheAdapter() {
        const adapter = this.Adapter('OpenAi')
        assert.isEqual(
            adapter.apiKey,
            process.env.SPRUCE_LLM_API_KEY,
            'API key not passed to adapter'
        )
    }

    @test()
    protected async passesThroughOptionsToTheAdapter() {
        const expected: OpenAiAdapterOptions = {
            memoryLimit: parseInt(process.env.SPRUCE_LLM_MEMORY_LIMIT!, 10),
            model: process.env.SPRUCE_LLM_MODEL,
            reasoningEffort: process.env
                .SPRUCE_LLM_REASONING_EFFORT as LllmReasoningEffort,
            baseUrl: process.env.SPRUCE_LLM_BASE_URL,
        }

        const adapter = this.Adapter('OpenAi')

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
    protected async passesApiKeyToAnthropicAdapter() {}

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
        return assert.doesThrow(() => AdapterLoader.Loader())
    }

    private Loader() {
        return AdapterLoader.Loader()
    }
}

class AdapterLoader {
    public static VALID_ADAPTERS = ['openai', 'anthropic', 'ollama']
    public static Loader() {
        const {
            env: { SPRUCE_LLM_ADAPTER },
        } = assertOptions(
            {
                env: process.env,
            },
            ['env.SPRUCE_LLM_ADAPTER']
        )

        const name = SPRUCE_LLM_ADAPTER!.toLowerCase()
        if (!AdapterLoader.VALID_ADAPTERS.includes(name)) {
            throw new SpruceError({
                code: 'INVALID_LLM_ADAPTER',
                adapter: SPRUCE_LLM_ADAPTER!,
            })
        }

        return new this()
    }

    public Adapter() {
        return OpenAiAdapter.Adapter(process.env.SPRUCE_LLM_API_KEY!, {
            memoryLimit: process.env.SPRUCE_LLM_MEMORY_LIMIT
                ? parseInt(process.env.SPRUCE_LLM_MEMORY_LIMIT!, 10)
                : undefined,
            model: process.env.SPRUCE_LLM_MODEL,
            reasoningEffort: process.env
                .SPRUCE_LLM_REASONING_EFFORT as LllmReasoningEffort,
            baseUrl: process.env.SPRUCE_LLM_BASE_URL,
        })
    }
}
