import SprucebotLlmBotImpl from '../bots/SprucebotLlmBotImpl'
import { LlmMessage, SprucebotLlmBot } from '../llm.types'

export default class SpyLlmBot
    extends SprucebotLlmBotImpl
    implements SprucebotLlmBot
{
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
