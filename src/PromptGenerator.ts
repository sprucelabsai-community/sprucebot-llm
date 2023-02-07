import {
	assertOptions,
	normalizeSchemaValues,
	Schema,
} from '@sprucelabs/schema'
import * as Eta from 'eta'
import { LlmMessage, SprucebotLlmBot } from './llm.types'

export default class PromptGenerator {
	private bot: SprucebotLlmBot
	private eta = Eta
	public constructor(bot: SprucebotLlmBot) {
		assertOptions({ bot }, ['bot'])
		this.bot = bot
	}

	public async generate(message: string) {
		const { youAre, stateSchema, state, messages } = this.bot.serialize()
		const { stateSchemaJson, stateJson } = this.stringifyState(
			stateSchema,
			state
		)

		return await this.eta.render(
			PROMPT_TEMPLATE,
			{
				youAre,
				messages: [
					...messages,
					{
						from: 'Me',
						message,
					},
				],
				stateSchemaJson,
				stateJson,
			},
			{
				async: true,
				autoEscape: false,
			}
		)
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
export const PROMPT_TEMPLATE = `You are <%= it.youAre %><% if (it.stateSchemaJson) { %>


Here is the schema for the state we're going to use for this interaction:

<%= it.stateSchemaJson %>


Here is the current state, which is based on the schema above:

<%= it.stateJson %>


After each message, send the state in the form:

------ <%= it.stateJson %> ------<% } %>


Let's get started:

<% it.messages.forEach((message) => { %>
<%= message.from %>: <%= message.message %>

<% }) %>

You:`
