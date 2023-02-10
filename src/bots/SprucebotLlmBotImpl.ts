import { AbstractEventEmitter } from '@sprucelabs/mercury-event-emitter'
import {
	assertOptions,
	defaultSchemaValues,
	Schema,
	SchemaValues,
} from '@sprucelabs/schema'
import ResponseParser from '../__tests__/behavioral/prompts/ResponseParser'
import {
	BotOptions,
	LlmAdapter,
	llmEventContract,
	LlmEventContract,
	LlmMessage,
	SerializedBot,
	SprucebotLlmBot,
	SprucebotLLmSkill,
} from '../llm.types'

export default class SprucebotLlmBotImpl<
		StateSchema extends Schema = Schema,
		State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>
	>
	extends AbstractEventEmitter<LlmEventContract>
	implements SprucebotLlmBot<StateSchema, State>
{
	private adapter: LlmAdapter
	private youAre: string
	private stateSchema?: StateSchema
	private state?: Partial<State>
	private isDone = false
	protected messages: LlmMessage[] = []
	private skill?: SprucebotLLmSkill

	public constructor(options: BotOptions<StateSchema, State>) {
		const { adapter, youAre, stateSchema, state, skill } = options

		super(llmEventContract)

		this.adapter = adapter
		this.youAre = youAre
		this.stateSchema = stateSchema
		this.skill = skill
		this.state = stateSchema
			? ({ ...defaultSchemaValues(stateSchema), ...state } as Partial<State>)
			: undefined
	}

	public markAsDone(): void {
		this.isDone = true
	}

	public getIsDone(): boolean {
		return this.isDone
	}

	public serialize(): SerializedBot<StateSchema, State> {
		const skill = this.skill?.serialize()
		return {
			youAre: this.youAre,
			stateSchema: this.stateSchema ?? skill?.stateSchema,
			state: this.state ?? skill?.state,
			messages: this.messages,
			skill,
		}
	}

	public async sendMessage(message: string): Promise<string> {
		assertOptions({ message }, ['message'])

		this.messages.push({
			from: 'Me',
			message,
		})

		const response = await this.adapter.sendMessage(this)

		const parser = ResponseParser.getInstance()
		const { isDone, message: parsedResponse } = parser.parse(response)

		this.isDone = isDone

		this.messages.push({
			from: 'You',
			message: parsedResponse,
		})

		return parsedResponse
	}

	public async updateState(newState: Partial<State>): Promise<void> {
		this.state = { ...this.state!, ...newState }
		await this.emit('did-update-state')
	}
}
