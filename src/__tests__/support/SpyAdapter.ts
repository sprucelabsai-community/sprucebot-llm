import { LlmAdapter, SprucebotLlmBot } from '../../llm.types'

export default class SpyAdapter implements LlmAdapter {
	public lastBot?: SprucebotLlmBot
	public lastMessage?: string
	public async sendMessage(bot: SprucebotLlmBot, message: string) {
		this.lastBot = bot
		this.lastMessage = message
	}
}
