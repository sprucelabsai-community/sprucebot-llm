import {
	assertOptions,
	normalizeSchemaValues,
	Schema,
} from '@sprucelabs/schema'
import * as Eta from 'eta'
import { LlmMessage, SprucebotLlmBot } from '../llm.types'

export default class PromptGenerator {
	private bot: SprucebotLlmBot
	private eta = Eta
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

		return await this.eta.render(
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

export const PROMPT_BOUNDARY = '*****'
export const DONE_TOKEN = `${PROMPT_BOUNDARY}DONE${PROMPT_BOUNDARY}`

export const PROMPT_TEMPLATE = `You are <%= it.youAre %>


For this interaction, every message I send will start with "__Me__:" and I'll prompt you for your message by starting with "__You__:". Whenever you answer, only answer after "__You__:" and stop before "__Me__:"

<% if (it.stateSchemaJson) { %>


Here is the schema that defines the state for this conversation:

<%= it.stateSchemaJson %>


Here is the current state, which is based on the schema above:

<%= it.stateJson %>


After each message, send the state in the form:

${PROMPT_BOUNDARY} <%= it.stateJson %> ${PROMPT_BOUNDARY}<% } %>

<% if (it.skill) { %>
	
Your primary objective for this conversation is <%= it.skill.yourJobIfYouChooseToAcceptItIs %>
<% if (it.skill.weAreDoneWhen) { %>
We are done when <%= it.skill.weAreDoneWhen %> At that point, send the message: ${DONE_TOKEN} so I know we have reached our primary objective.
<% } %>
<% } %>

Let's get started:

<% it.messages.forEach((message) => { %>
__<%= message.from %>__: <%= message.message %>

<% }) %>
__You__:`
