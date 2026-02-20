import { assertOptions } from '@sprucelabs/schema'
import SpruceError from '../../errors/SpruceError'
import { LllmReasoningEffort } from '../../llm.types'
import AnthropicAdapter, { AnthropicAdapterOptions } from './AnthropicAdapter'
import OllamaAdapter from './OllamaAdapter'
import OpenAiAdapter from './OpenAiAdapter'

export default class LlmAdapterLoader {
    public static VALID_ADAPTERS = ['openai', 'anthropic', 'ollama']
    private adapterName: string

    private constructor(adapterName: string) {
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
        if (!LlmAdapterLoader.VALID_ADAPTERS.includes(name)) {
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

        return new this(name)
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
        const thinking = process.env.SPRUCE_LLM_THINKING === 'true'

        if (this.adapterName === 'anthropic') {
            return AnthropicAdapter.Adapter(key, {
                ...options,
                thinking,
                maxTokens: parseInt(process.env.SPRUCE_LLM_MAX_TOKENS!, 10),
            } as AnthropicAdapterOptions)
        }

        if (this.adapterName === 'ollama') {
            return OllamaAdapter.Adapter({ ...options, think: thinking })
        }

        return OpenAiAdapter.Adapter(key, {
            ...options,
            reasoningEffort: process.env
                .SPRUCE_LLM_REASONING_EFFORT as LllmReasoningEffort,
        })
    }
}
