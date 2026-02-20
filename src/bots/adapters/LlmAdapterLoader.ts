import { assertOptions } from '@sprucelabs/schema'
import SpruceError from '../../errors/SpruceError'
import { LllmReasoningEffort, LlmAdapter } from '../../llm.types'
import AnthropicAdapter, { AnthropicAdapterOptions } from './AnthropicAdapter'
import OllamaAdapter from './OllamaAdapter'
import OpenAiAdapter from './OpenAiAdapter'

export default class LlmAdapterLoaderImpl implements LlmAdapterLoader {
    public static Class?: new (
        adapterName: ValidAdapterName
    ) => LlmAdapterLoader
    public static VALID_ADAPTERS = ['openai', 'anthropic', 'ollama']

    private adapterName: ValidAdapterName

    protected constructor(adapterName: ValidAdapterName) {
        this.adapterName = adapterName
    }

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
        if (!LlmAdapterLoaderImpl.VALID_ADAPTERS.includes(name)) {
            throw new SpruceError({
                code: 'INVALID_LLM_ADAPTER',
                adapter: SPRUCE_LLM_ADAPTER!,
            })
        }

        if (name === 'anthropic') {
            assertOptions(
                {
                    env: process.env,
                },
                ['env.SPRUCE_LLM_MAX_TOKENS']
            )
        }

        return new (this.Class ?? this)(name as ValidAdapterName)
    }

    public Adapter() {
        const key = process.env.SPRUCE_LLM_API_KEY!
        const options: Record<string, any> = {
            memoryLimit: process.env.SPRUCE_LLM_MEMORY_LIMIT
                ? parseInt(process.env.SPRUCE_LLM_MEMORY_LIMIT!, 10)
                : undefined,
            model: process.env.SPRUCE_LLM_MODEL,
            baseUrl: process.env.SPRUCE_LLM_BASE_URL,
        }

        return this.constructorsByName[this.adapterName](key, options)
    }

    private constructorsByName: Record<
        ValidAdapterName,
        LllmAdapterConstructor
    > = {
        openai: (key: string, options: Record<string, any>) => {
            return OpenAiAdapter.Adapter(key, {
                ...options,
                reasoningEffort: process.env
                    .SPRUCE_LLM_REASONING_EFFORT as LllmReasoningEffort,
            })
        },
        anthropic: (key: string, options: Record<string, any>) => {
            return AnthropicAdapter.Adapter(key, {
                ...options,
                thinking: process.env.SPRUCE_LLM_THINKING === 'true',
                maxTokens: parseInt(process.env.SPRUCE_LLM_MAX_TOKENS!, 10),
            } as AnthropicAdapterOptions)
        },
        ollama: (_key: string, options: Record<string, any>) => {
            return OllamaAdapter.Adapter({
                ...options,
                think: process.env.SPRUCE_LLM_THINKING === 'true',
            })
        },
    }
}

export interface LlmAdapterLoader {
    Adapter(): LlmAdapter
}

type ValidAdapterName = 'openai' | 'anthropic' | 'ollama'
type LllmAdapterConstructor = (
    key: string,
    options: Record<string, any>
) => LlmAdapter
