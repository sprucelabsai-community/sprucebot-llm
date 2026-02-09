import { AbstractEventEmitter } from '@sprucelabs/mercury-event-emitter'
import { defaultSchemaValues, Schema, SchemaValues } from '@sprucelabs/schema'
import {
    llmEventContract,
    LlmEventContract,
    SerializedSkill,
    SkillOptions,
    SprucebotLLmSkill,
} from '../llm.types'
import InternalStateUpdater from './InternalStateUpdater'

export default class SprucebotLlmSkillImpl<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
>
    extends AbstractEventEmitter<LlmEventContract>
    implements SprucebotLLmSkill<StateSchema, State>
{
    protected options: SkillOptions
    private state?: Partial<State> = {}
    protected stateSchema?: StateSchema

    public constructor(options: SkillOptions<StateSchema, State>) {
        super(llmEventContract)
        const { state, stateSchema, ...rest } = options ?? {}

        this.options = { ...rest, stateSchema }
        this.stateSchema = stateSchema
        this.state = stateSchema
            ? ({
                  ...defaultSchemaValues(stateSchema),
                  ...state,
              } as Partial<State>)
            : undefined
    }

    public async updateState(updates: Partial<State>) {
        await InternalStateUpdater.updateState(this, updates)
    }

    public getState() {
        return this.state
    }

    public setModel(model: string): void {
        this.options.model = model
    }

    public serialize(): SerializedSkill<StateSchema, State> {
        return {
            ...this.options,
            stateSchema: this.stateSchema,
            state: this.state,
        }
    }

    public silentlySetState(state: Partial<State>) {
        this.state = state
    }

    public getStateSchema() {
        return this.stateSchema
    }
}
