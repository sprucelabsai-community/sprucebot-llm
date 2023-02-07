import { LlmAdapter, SprucebotLlmBot } from '../../llm.types'

export default class SpyAdapter implements LlmAdapter {
	public lastBot?: SprucebotLlmBot
	public lastMessage?: string
	public messageResponse = ''
	public async sendMessage(bot: SprucebotLlmBot) {
		this.lastBot = bot
		return this.messageResponse
	}
}
