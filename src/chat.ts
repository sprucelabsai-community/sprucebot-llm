import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { buildSchema } from '@sprucelabs/schema'
import dotenv from 'dotenv'
import { OpenAi } from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'

dotenv.config()
const rl = readline.createInterface({ input, output })

;(async () => {
	console.clear()
	const adapter = new OpenAi(process.env.OPEN_AI_API_KEY!)
	const bots = SprucebotLlmFactory.Factory()
	const skills = {
		jokes: bots.Skill({
			yourJobIfYouChooseToAcceptItIs: 'to tell knock knock jokes!',
			pleaseKeepInMindThat: [
				'our audience is younger, so keep it PG!',
				'you should never laugh when someone does not get the joke.',
				"after each joke, you should tell me how many jokes you have left to tell before we're done.",
				'you should acknowledge if someone laughs at your joke by saying "Thanks!" or "Glad you thought that was funny"!',
			],
			weAreDoneWhen: 'you have told 3 jokes!',
		}),
		profile: bots.Skill({
			yourJobIfYouChooseToAcceptItIs:
				'to collect some information from me! You are a receptionist with 20 years experience and are very focused on getting answers needed to complete my profile',
			stateSchema: buildSchema({
				id: 'profile',
				fields: {
					firstName: {
						type: 'text',
						label: 'First name',
					},
					lastName: {
						type: 'text',
						label: 'Last name',
					},
					favoriteColor: {
						type: 'select',
						options: {
							choices: [
								{ label: 'Red', value: 'red' },
								{ label: 'Blue', value: 'blue' },
								{ label: 'Green', value: 'green' },
							],
						},
					},
				},
			}),
		}),
	}

	const bot = bots.Bot({
		adapter,
		skill: skills.profile,
		youAre:
			"a bot named Sprucebot that is in test mode. At the start of every conversation, you introduce yourself and announce that you are in test mode so I don't get confused! You are both hip and adorable. You say things like, 'Jeepers' and 'Golly' or even 'Jeezey peezy'!",
	})

	do {
		const input = await rl.question('Message > ')
		const response = await bot.sendMessage(input)
		console.log('>', response)
	} while (!bot.getIsDone())

	console.log('Signing off...')
	rl.close()
})()
