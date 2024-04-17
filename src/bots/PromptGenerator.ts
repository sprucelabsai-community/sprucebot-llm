import {
    assertOptions,
    normalizeSchemaValues,
    Schema,
} from '@sprucelabs/schema'
import { Eta } from 'eta'
import { LlmMessage, SprucebotLlmBot } from '../llm.types'
import { PROMPT_TEMPLATE } from './templates'

export default class PromptGenerator {
    private bot: SprucebotLlmBot
    private eta = new Eta()
    private log =
        process.env.SHOULD_LOG_GENERATED_PROMPTS === 'true'
            ? console.info
            : () => {}
    public static Class?: typeof PromptGenerator
    private promptTemplate: string

    protected constructor(
        bot: SprucebotLlmBot,
        options?: PromptGeneratorOptions
    ) {
        assertOptions({ bot }, ['bot'])
        this.bot = bot
        this.promptTemplate = options?.promptTemplate ?? PROMPT_TEMPLATE
    }

    public static Generator(
        bot: SprucebotLlmBot,
        options?: PromptGeneratorOptions
    ) {
        return new (this.Class ?? PromptGenerator)(bot, options)
    }

    public async generate() {
        const { stateSchema, state, ...rest } = this.bot.serialize()
        const { stateSchemaJson, stateJson } = this.stringifyState(
            stateSchema,
            state
        )

        const rendered = await this.eta.renderStringAsync(this.promptTemplate, {
            stateSchemaJson,
            stateJson,
            ...rest,
        })

        this.log('Generated prompt:', rendered)

        return rendered
    }

    private stringifyState(
        stateSchema: Schema | null | undefined,
        state: Record<string, any> | null | undefined
    ) {
        if (!stateSchema) {
            return {
                stateSchemaJson: null,
                stateJson: null,
            }
        }
        const normalizedState = normalizeSchemaValues(
            stateSchema,
            state ?? {},
            {}
        )
        setUndefinedToNull(normalizedState)

        const stateSchemaJson = JSON.stringify(stateSchema)
        const stateJson = JSON.stringify(normalizedState)
        return { stateSchemaJson, stateJson }
    }
}
export function setUndefinedToNull(obj: Record<string, any>) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] === undefined) {
                obj[key] = null
            } else if (typeof obj[key] === 'object') {
                setUndefinedToNull(obj[key])
            }
        }
    }
}

export interface TemplateContext {
    youAre: string
    messages: LlmMessage[]
    stateSchemaJson?: string
    stateJson?: string
}

export interface PromptGeneratorOptions {
    promptTemplate?: string
}
