import {
    buildEventContract,
    MercuryEventEmitter,
} from '@sprucelabs/mercury-types'
import { Schema, SchemaValues } from '@sprucelabs/schema'

export interface BotOptions<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> extends Omit<PromptOptions<StateSchema, State>, 'skill'> {
    adapter: LlmAdapter
    Class?: new (...opts: any[]) => SprucebotLlmBot<Schema, State>
    skill?: SprucebotLLmSkill<Schema>
}

export interface SprucebotLlmBot<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> extends MercuryEventEmitter<LlmEventContract> {
    markAsDone(): void
    getIsDone(): boolean
    sendMessage(
        message: SendMessage,
        responseCb?: MessageResponseCallback
    ): Promise<string>
    serialize(): SerializedBot<StateSchema, State>
    updateState(state: Partial<State>): Promise<void>
    setSkill(skill: SprucebotLLmSkill<any>): void
    clearMessageHistory(): void
}

export interface LlmAdapter {
    sendMessage(
        bot: SprucebotLlmBot<Schema>,
        options?: SendMessageOptions
    ): Promise<string>
}

export interface PromptOptions<
    StateSchema extends Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> {
    /**
     * Tell the bot who/what it is. Example: youAre: "a super funny comedian. You absolutely love dad jokes!"
     */
    youAre: string
    stateSchema?: StateSchema
    state?: Partial<State>
    skill?: SerializedSkill<Schema>
}

export interface SendMessageOptions {
    model?: string
}

export interface SerializedBot<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> extends PromptOptions<Schema, State> {
    messages: LlmMessage[]
}

export const llmEventContract = buildEventContract({
    eventSignatures: {
        'did-update-state': {},
    },
})

export type LlmEventContract = typeof llmEventContract

export interface LlmMessage {
    from: 'Me' | 'You'
    message: string
    imageBase64?: string
}

export interface SkillOptions<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> {
    yourJobIfYouChooseToAcceptItIs: string
    weAreDoneWhen?: string
    pleaseKeepInMindThat?: string[]
    stateSchema?: StateSchema
    state?: Partial<State>
    callbacks?: LlmCallbackMap
    model?: string
}

export interface SprucebotLLmSkill<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> extends MercuryEventEmitter<LlmEventContract> {
    getState(): Partial<State> | undefined
    serialize(): SerializedSkill<StateSchema, State>
    updateState(state: Partial<State>): Promise<void>
}

export interface SerializedSkill<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> extends SkillOptions<StateSchema, State> {}

export type LlmCallbackMap = Record<string, LlmCallback>

export type LmmCallbackResponse =
    | void
    | SendMessage
    | Promise<SendMessage>
    | Promise<void>

export interface LlmCallback {
    cb: (options?: Record<string, any>) => LmmCallbackResponse
    useThisWhenever: string
    parameters?: LlmCallbackParameter[]
}

export interface LlmCallbackParameter {
    name: string
    type:
        | ('string' | 'number' | 'boolean' | 'dateMs' | 'dateTimeMs')
        | (string & {})
    isRequired?: boolean
    description?: string
}

export type MessageResponseCallback = (message: string) => any

export type SendMessage = string | SendMessageWithImage

export interface SendMessageWithImage {
    imageDescription: string
    imageBase64: string
}
