import { AbstractEventEmitter } from '@sprucelabs/mercury-event-emitter'
import {
	assertOptions,
	defaultSchemaValues,
	Schema,
	SchemaValues,
} from '@sprucelabs/schema'
import {
	BotOptions,
	LlmAdapter,
	llmBotContract,
	LlmBotContract,
	PromptOptions,
	SprucebotLlmBot,
} from '../llm.types'

export default class SprucebotLlmBotImpl<
		StateSchema extends Schema = Schema,
		State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>
	>
	extends AbstractEventEmitter<LlmBotContract>
	implements SprucebotLlmBot<StateSchema, State>
{
	private adapter: LlmAdapter
	private youAre: string
	private stateSchema?: StateSchema
	private state?: Partial<State>

	public constructor(options: BotOptions<StateSchema, State>) {
		const { adapter, youAre, stateSchema, state } = options

		super(llmBotContract)

		this.adapter = adapter
		this.youAre = youAre
		this.stateSchema = stateSchema
		this.state = stateSchema
			? ({ ...defaultSchemaValues(stateSchema), ...state } as Partial<State>)
			: undefined
	}

	public isDone(): boolean {
		return false
	}

	public serialize(): PromptOptions<StateSchema, State> {
		return {
			youAre: this.youAre,
			stateSchema: this.stateSchema,
			state: this.state,
		}
	}

	public async sendMessage(message: string): Promise<void> {
		assertOptions({ message }, ['message'])
		await this.adapter.sendMessage(this, message)
	}

	public async updateState(newState: Partial<State>): Promise<void> {
		this.state = { ...this.state!, ...newState }
		await this.emit('did-update-state')
	}
}
