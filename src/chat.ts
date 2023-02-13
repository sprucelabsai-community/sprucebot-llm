import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { buildSchema } from '@sprucelabs/schema'
import dotenv from 'dotenv'
import { OpenAi } from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'
import buildCallbackSkill from './examples/buildCallbackSkill'
import buildJokeSkill from './examples/buildJokeSkill'
import buildProfileSkill from './examples/buildProfileSkill'

dotenv.config()
const rl = readline.createInterface({ input, output })

;(async () => {
	console.clear()

	const adapter = new OpenAi(process.env.OPEN_AI_API_KEY!)
	const bots = SprucebotLlmFactory.Factory()

	const skills = {
		jokes: buildJokeSkill(bots),
		profile: buildProfileSkill(bots),
		callbacks: buildCallbackSkill(bots),
		fileTransformer: bots.Skill({
			yourJobIfYouChooseToAcceptItIs:
				'is to convert data from one format to another. Since you are a robot, this should be no problem for you! You are going to jump right in by asking me the import and output formats and then the data to convert!',
			pleaseKeepInMindThat: [
				'you will need to ask me the format of the input and the desired format of the output.',
				'last step is to take the data and convert it to the desired format and send it back to me.',
			],
			stateSchema: buildSchema({
				id: 'fileTransformer',
				fields: {
					inputFormat: {
						type: 'text',
					},
					outputFormat: {
						type: 'text',
					},
					dataToConvert: {
						type: 'text',
					},
				},
			}),
			weAreDoneWhen:
				'You have converted the input to the desired output format and sent it back to me.',
		}),
	}

	const bot = bots.Bot({
		adapter,
		skill: skills.fileTransformer,
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
