import { AbstractEventEmitter } from '@sprucelabs/mercury-event-emitter'
import {
    assertOptions,
    defaultSchemaValues,
    Schema,
    SchemaValues,
    validateSchemaValues,
} from '@sprucelabs/schema'
import {
    BotOptions,
    LlmAdapter,
    llmEventContract,
    LlmEventContract,
    LlmMessage,
    MessageResponseCallback,
    SendMessage,
    SerializedBot,
    SprucebotLlmBot,
    SprucebotLLmSkill,
} from '../llm.types'
import TurnRequest from './TurnRequest'

export default class SprucebotLlmBotImpl<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
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
    private activeTurn?: TurnRequest

    public constructor(options: BotOptions<StateSchema, State>) {
        const { adapter, youAre, stateSchema, state, skill } = options

        super(llmEventContract)

        this.adapter = adapter
        this.youAre = youAre
        this.stateSchema = stateSchema
        this.skill = skill
        this.state = stateSchema
            ? ({
                  ...defaultSchemaValues(stateSchema),
                  ...state,
              } as Partial<State>)
            : undefined
    }

    public clearMessageHistory(): void {
        this.messages = []
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

    public async sendMessage(
        message: SendMessage,
        cb?: MessageResponseCallback
    ): Promise<string> {
        assertOptions({ message }, ['message'])

        const llmMessage: LlmMessage = {
            from: 'Me',
            message: '',
        }

        if (typeof message === 'string') {
            llmMessage.message = message
        } else {
            llmMessage.message = message.imageDescription
            llmMessage.imageBase64 = message.imageBase64
        }

        this.activeTurn?.cancel()

        this.activeTurn = new TurnRequest({
            adapter: this.adapter,
            bot: this,
            optionallyUpdateState: this.optionallyUpdateState.bind(this),
            setDone: (isDone) => (this.isDone = isDone),
            skill: this.skill,
            trackMessage: this.trackMessage.bind(this),
        })

        return this.activeTurn.sendMessage(llmMessage, cb)
    }

    private async optionallyUpdateState(
        state: Record<string, any> | undefined
    ) {
        if (this.stateSchema && state) {
            await this.updateState(state as Partial<State>)
        } else if (state) {
            await this.skill?.updateState(state)
        }
    }

    private trackMessage(m: LlmMessage) {
        if (this.messages.length === SprucebotLlmBotImpl.messageMemoryLimit) {
            this.messages.shift()
        }
        this.messages.push(m)
    }

    public async updateState(newState: Partial<State>): Promise<void> {
        validateSchemaValues(this.stateSchema!, newState)
        this.state = { ...this.state!, ...newState }
        await this.emit('did-update-state')
    }

    public setSkill(skill: SprucebotLLmSkill<any>) {
        this.skill = skill
        this.isDone = false
    }
}
