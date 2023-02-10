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

export const STATE_BOUNDARY = '*****'
export const DONE_TOKEN = `____ DONE ____`
export const CALLBACK_BOUNDARY = '*|*|*|'

export const PROMPT_TEMPLATE = `You are <%= it.youAre %>


For this interaction, every message I send will start with "__Me__:" and I'll prompt you for your response by starting with "__You__:".

__Me__: Do you understand?
__You__: Yes

<% if (it.stateSchemaJson) { %>

Here is the schema that defines the state for this conversation:

<%= it.stateSchemaJson %>


Here is the current state, which is based on the schema above:

<%= it.stateJson %>


After each message, send the state in the form:

${STATE_BOUNDARY} <%= it.stateJson %> ${STATE_BOUNDARY}

When asking me about a "select" field, make sure I only pick a valid choice by showing me their labels! Don't forget to update the state as we go when you attach it to every message you send!<% } %>

<% if (it.skill) { %>
	
Your primary objective for this conversation is <%= it.skill.yourJobIfYouChooseToAcceptItIs %>
<% if (!it.stateSchemaJson && it.skill.weAreDoneWhen) { %>
We are done when <%= it.skill.weAreDoneWhen %> At that point, send me the following message so I know we are done:

${DONE_TOKEN}
<% } %>
<% } %>
<% if (it.stateSchemaJson) { %>

Once you have asked about every field in the schema, send me the following message:

${DONE_TOKEN}
<% } %>

Let's get started:

<% it.messages.forEach((message) => { %>
__<%= message.from %>__: <%= message.message %>

<% }) %>
__You__:`
