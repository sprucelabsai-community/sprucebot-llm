import { Schema, SchemaValues } from '@sprucelabs/schema'
import SprucebotLlmBotImpl from '../bots/SprucebotLlmBotImpl'
import { BotOptions, LlmMessage, SprucebotLlmBot } from '../llm.types'

export default class SpyLlmBot<
        StateSchema extends Schema = Schema,
        State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
    >
    extends SprucebotLlmBotImpl<StateSchema, State>
    implements SprucebotLlmBot
{
    public static instance: SpyLlmBot

    public constructor(options: BotOptions<StateSchema, State>) {
        super(options)
        SpyLlmBot.instance = this
    }

    public getState() {
        return this.state
    }

    public getSkill() {
        return this.skill
    }

    public setMessages(messages: LlmMessage[]) {
        this.messages = messages
    }

    public getMessages() {
        return this.messages
    }
}
