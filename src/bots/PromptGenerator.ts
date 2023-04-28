import {
	assertOptions,
	normalizeSchemaValues,
	Schema,
} from '@sprucelabs/schema'
import * as Eta from 'eta'
import { LlmMessage, SprucebotLlmBot } from '../llm.types'
import { PROMPT_TEMPLATE } from './templates'

export default class PromptGenerator {
	private bot: SprucebotLlmBot
	private eta = Eta
	private log =
		process.env.SHOULD_LOG_GENERATED_PROMPTS === 'true'
			? console.info
			: () => {}
	public constructor(bot: SprucebotLlmBot) {
		assertOptions({ bot }, ['bot'])
		this.bot = bot
	}

	public async generate() {
		const { stateSchema, state, ...rest } = this.bot.serialize()
		const { stateSchemaJson, stateJson } = this.stringifyState(
			stateSchema,
			state
		)

		const rendered = await this.eta.render(
			PROMPT_TEMPLATE,
			{
				stateSchemaJson,
				stateJson,
				...rest,
			},
			{
				async: true,
				autoEscape: false,
			}
		)

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
		const normalizedState = normalizeSchemaValues(stateSchema, state ?? {}, {})
		setUndefinedToNull(normalizedState)

		const stateSchemaJson = JSON.stringify(stateSchema)
		const stateJson = JSON.stringify(normalizedState)
		return { stateSchemaJson, stateJson }
	}
}
export function setUndefinedToNull(obj: Record<string, any>) {
	for (const key in obj) {
		// eslint-disable-next-line no-prototype-builtins
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
