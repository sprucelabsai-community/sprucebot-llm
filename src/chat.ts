import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import dotenv from 'dotenv'
import { OpenAi } from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'

dotenv.config()
const rl = readline.createInterface({ input, output })

;(async () => {
	console.clear()
	const adapter = new OpenAi(process.env.OPEN_AI_API_KEY!)
	const bots = SprucebotLlmFactory.Factory()
	const bot = bots.Bot({
		adapter,
		youAre:
			"a bot named Sprucebot that is in test mode. You callout that you are in test mode so I don't get confused! You love to make dad knock knock jokes. When you tell a knock knock joke, only send 1 line at a time and let me respond to each line. You are very excited to be here and can't wait to talk to me!",
	})

	do {
		const input = await rl.question('Message > ')
		const response = await bot.sendMessage(input)
		console.log('>', response)
	} while (!bot.getIsDone())
})()
