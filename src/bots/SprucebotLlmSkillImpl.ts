import { AbstractEventEmitter } from '@sprucelabs/mercury-event-emitter'
import { defaultSchemaValues, Schema, SchemaValues } from '@sprucelabs/schema'
import {
	llmEventContract,
	LlmEventContract,
	SerializedSkill,
	SkillOptions,
	SprucebotLLmSkill,
} from '../llm.types'

export default class SprucebotLlmSkillImpl<
		StateSchema extends Schema = Schema,
		State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
	>
	extends AbstractEventEmitter<LlmEventContract>
	implements SprucebotLLmSkill<StateSchema, State>
{
	private options: SkillOptions
	private state?: Partial<State> = {}
	private stateSchema?: StateSchema | undefined

	public constructor(options: SkillOptions<StateSchema, State>) {
		super(llmEventContract)
		const { state, stateSchema, ...rest } = options
		this.options = { ...rest, stateSchema }

		this.stateSchema = stateSchema
		this.state = stateSchema
			? ({ ...defaultSchemaValues(stateSchema), ...state } as Partial<State>)
			: undefined
	}

	public async updateState(updates: Partial<State>) {
		await this.emit('did-update-state')
		this.state = { ...this.state, ...updates }
	}

	public getState() {
		return this.state
	}

	public serialize(): SerializedSkill<StateSchema, State> {
		return { ...this.options, stateSchema: this.stateSchema, state: this.state }
	}
}
