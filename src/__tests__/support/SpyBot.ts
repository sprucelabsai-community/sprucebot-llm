import SprucebotLlmBotImpl from '../../bots/SprucebotLlmBotImpl'
import { LlmMessage, SprucebotLlmBot } from '../../llm.types'

export class SpyBot extends SprucebotLlmBotImpl implements SprucebotLlmBot {
	public setMessages(messages: LlmMessage[]) {
		this.messages = messages
	}

	public async getMessages() {
		return this.messages
	}
}
