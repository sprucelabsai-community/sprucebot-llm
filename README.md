# sprucebot-llm (WIP)
A Typescript library for leveraging Large Langage Models (like GPT-3) to do... anything!

* Has memory
    * Remembers past messages to build context
    * Configure how much of the conversation your bot should remember*
* [Manages state](#adding-state-to-your-conversation)
    * The state builds as the conversation continues
    * Invoke callbacks whenever state changes
* [Connect to 3rd party API's](pulling-from-3rd-party-apis)
    * Pull in data in real time
    * Have your bot respond generated responses
* Unlimited use cases
    * Skill architecture for extensibility
    * Leverage Skills to get your bot to complete any task!
* Adapter Interface to create your own adapters
    * Only support GPT-3 for now (more adapters based on demand)
* Fully typed


*In progress
## Getting started

### Install the library

```bash
yarn add @sprucelabs/sprucebot-llm
```

### Building your first joke bot
You can use `sprucebot-llm` inside any Javascript runtime (nodejs, browser).

Create a file called `chat.ts` and add the following to get started:

```ts
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
			'you should acknowledge if someone laughs at your joke by saying "Thanks!" or "Glad you thought that was funny"!',
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

	console.log('Signing off...')
	rl.close()
})()


```

### Adding state to your conversation
This library depends on [`@sprucelabs/spruce-schema`](https://github.com/sprucelabsai/spruce-schema) to handle the structure and validation rules around your state.
```ts
const skill = bots.Skill({
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
	})

```

### Listening to state changes

If you supply a `stateSchema` then your bot will work through it until the state is completely updated. While the conversation is taking place, if the state changes, the skill will emit `did-update-state`

```ts
await skill.on('did-update-state', () => {
	console.log('we are making progress!')
	console.log(JSON.stringify(this.skill.getState()))
})

```
### Pulling from 3rd party api's

The approach to integrating 3rd party api's (as well as dropping in other dynamic data into responses) is straight forward.

```ts
const skill = bots.Skill({
	yourJobIfYouChooseToAcceptItIs:
		"to be be the best appointment taker on the planet. You have a many years of experience. You are going to ask me only 2 questions for this practice run. First, you'll ask me to pick an available time. Then, you'll ask me to pick my favorite color!",
	callbacks: {
		availableTimes: {
			cb: async () => {
				return ['9am', '10am', '11am', '1pm', '4pm', '5pm', '12am.'].join(
					'\n'
				)
			},
			useThisWhenever: 'your are showing what times I can pick from.',
		},
		favoriteColor: {
			cb: async () => {
				return ['red', 'blue', 'green', 'purple'].join('\n')
			},
			useThisWhenever: 'your are showing what colors I can pick from.',
		},
	},
})