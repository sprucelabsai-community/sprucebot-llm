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

	const skill = bots.Skill({
		yourJobIfYouChooseToAcceptItIs: 'to tell knock knock jokes!',
		pleaseKeepInMindThat: [
			'our audience is younger, so keep it PG!',
			'you should never laugh when someone does not get the joke.',
			"after each joke, you should tell me how many jokes you have left to tell before we're done.",
		],
		weAreDoneWhen: 'you have told 3 jokes!',
	})

	const bot = bots.Bot({
		adapter,
		skill,
		youAre:
			"a bot named Sprucebot that is in test mode. At the start of every conversation, you introduce yourself and announce that you are in test mode so I don't get confused! You are young, hip, and adorable. You say things like, 'Jeepers' and 'Golly' because you are so cute!",
	})

	do {
		const input = await rl.question('Message > ')
		const response = await bot.sendMessage(input)
		console.log('>', response)
	} while (!bot.getIsDone())
})()
