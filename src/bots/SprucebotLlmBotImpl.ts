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
	llmEventContract,
	LlmEventContract,
	LlmMessage,
	SerializedBot,
	SprucebotLlmBot,
	SprucebotLLmSkill,
} from '../llm.types'
import ResponseParser from '../parsingResponses/ResponseParser'

export default class SprucebotLlmBotImpl<
		StateSchema extends Schema = Schema,
		State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>
	>
	extends AbstractEventEmitter<LlmEventContract>
	implements SprucebotLlmBot<StateSchema, State>
{
	public static messageMemoryLimit = 10
	private adapter: LlmAdapter
	private youAre: string
	private stateSchema?: StateSchema
	protected state?: Partial<State>
	private isDone = false
	protected messages: LlmMessage[] = []
	protected skill?: SprucebotLLmSkill

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

		this.trackMessage({
			from: 'Me',
			message,
		})

		const response = await this.adapter.sendMessage(this)

		const parser = ResponseParser.getInstance()
		const {
			isDone,
			message: parsedResponse,
			state,
		} = await parser.parse(response, this.skill?.serialize().callbacks)

		this.isDone = isDone

		if (this.stateSchema && state) {
			await this.updateState(state as Partial<State>)
		} else if (state) {
			await this.skill?.updateState(state)
		}

		this.trackMessage({
			from: 'You',
			message: parsedResponse,
		})

		return parsedResponse
	}

	private trackMessage(m: LlmMessage) {
		if (this.messages.length === SprucebotLlmBotImpl.messageMemoryLimit) {
			this.messages.shift()
		}
		this.messages.push(m)
	}

	public async updateState(newState: Partial<State>): Promise<void> {
		this.state = { ...this.state!, ...newState }
		await this.emit('did-update-state')
	}

	public setSkill(skill: SprucebotLLmSkill<any>) {
		this.skill = skill
	}
}
