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
    LlmCallbackMap,
    llmEventContract,
    LlmEventContract,
    LlmMessage,
    MessageResponseCallback,
    SendMessage,
    SerializedBot,
    SprucebotLlmBot,
    SprucebotLLmSkill,
} from '../llm.types'
import ResponseParser from '../parsingResponses/ResponseParser'

export default class SprucebotLlmBotImpl<
        StateSchema extends Schema = Schema,
        State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
    >
    extends AbstractEventEmitter<LlmEventContract>
    implements SprucebotLlmBot<StateSchema, State>
{
    public static messageMemoryLimit = 10
    protected adapter: LlmAdapter
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

        this.trackMessage(llmMessage)

        const { model, callbacks } = this.skill?.serialize() ?? {}
        const response = await this.sendMessageToAdapter(model)

        let parsedMessage: string
        let isDone: boolean
        let state: Record<string, any> | undefined
        let callbackResults: SendMessage | undefined

        try {
            const parsed = await this.parseResponse(response, callbacks)
            parsedMessage = parsed.message
            isDone = parsed.isDone
            state = parsed.state
            callbackResults = parsed.callbackResults
        } catch (err: any) {
            if (err.options?.code === 'INVALID_CALLBACK') {
                return this.sendMessage(`Error: ${err.message}`, cb)
            }
            throw err
        }

        this.isDone = isDone

        await this.optionallyUpdateState(state)

        this.trackMessage({
            from: 'You',
            message: response,
        })

        cb?.(parsedMessage)

        if (callbackResults) {
            let message: SendMessage | undefined
            if (typeof callbackResults === 'string') {
                message = `API Results: ${callbackResults}`
            } else {
                message = {
                    imageBase64: callbackResults.imageBase64,
                    imageDescription: `API Results: ${callbackResults.imageDescription}`,
                }
            }
            await this.sendMessage(message, cb)
        }

        return parsedMessage
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

    private async parseResponse(response: string, callbacks?: LlmCallbackMap) {
        const parser = ResponseParser.getInstance()
        const parsed = await parser.parse(response, callbacks)
        return parsed
    }

    private async sendMessageToAdapter(model: string | undefined) {
        return await this.adapter.sendMessage(this, {
            model,
        })
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
        this.isDone = false
    }
}
