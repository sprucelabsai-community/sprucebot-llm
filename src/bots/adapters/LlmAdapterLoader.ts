import { assertOptions } from '@sprucelabs/schema'
import { Log } from '@sprucelabs/spruce-skill-utils'
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
    private log?: Log

    protected constructor(adapterName: ValidAdapterName, log?: Log) {
        this.adapterName = adapterName
        this.log = log
    }

    public static Loader(log?: Log) {
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

        return new (this.Class ?? this)(name as ValidAdapterName, log)
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
                log: this.log?.buildLog('OpenAiAdapter'),
            })
        },
        anthropic: (key: string, options: Record<string, any>) => {
            const opts = {
                ...options,
                thinking: process.env.SPRUCE_LLM_THINKING === 'true',
                maxTokens: parseInt(process.env.SPRUCE_LLM_MAX_TOKENS!, 10),
            } as AnthropicAdapterOptions

            this.log?.info(
                'Loading Anthropic adapter with options',
                JSON.stringify(opts, null, 2)
            )

            return AnthropicAdapter.Adapter(key, {
                ...opts,
                log: this.log?.buildLog('AnthropicAdapter'),
            })
        },
        ollama: (_key: string, options: Record<string, any>) => {
            return OllamaAdapter.Adapter({
                ...options,
                think: process.env.SPRUCE_LLM_THINKING === 'true',
                log: this.log?.buildLog('OllamaAdapter'),
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
