import {
	buildEventContract,
	MercuryEventEmitter,
} from '@sprucelabs/mercury-types'
import { Schema, SchemaValues } from '@sprucelabs/schema'

interface SprucebotLlmSkills {}

export type SprucebotLlmSkillName = keyof SprucebotLlmSkills

export interface BotOptions<
	StateSchema extends Schema = Schema,
	State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>
> extends PromptOptions<StateSchema, State> {
	adapter: LlmAdapter
}

export interface SprucebotLlmBot<
	StateSchema extends Schema = Schema,
	State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>
> extends MercuryEventEmitter<LlmBotContract> {
	isDone(): boolean
	sendMessage(message: string): Promise<void>
	serialize(): PromptOptions<StateSchema, State>
	updateState(state: Partial<State>): Promise<void>
}

export interface LlmAdapter {
	sendMessage(bot: SprucebotLlmBot<Schema>, message: string): Promise<void>
}

export interface PromptOptions<
	StateSchema extends Schema,
	State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>
> {
	/**
	 * Tell the bot who/what it is. Example: youAre: "a super funny comedian. You absolutely love dad jokes!"
	 */
	youAre: string
	stateSchema?: StateSchema
	state?: Partial<State>
}

export const llmBotContract = buildEventContract({
	eventSignatures: {
		'did-update-state': {},
	},
})

export type LlmBotContract = typeof llmBotContract
