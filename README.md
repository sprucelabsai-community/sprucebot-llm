# sprucebot-llm
A Typescript library for leveraging Large Langage Models (like GPT-3) to do... anything!

* [Has memory](#memory)
    * Remembers past messages to build context
    * Configure how much of the conversation your bot should remember
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
    * Only support OpenAI models for now (more adapters based on demand)
* Fully typed


## Getting started

### Install the library as a dependency

```bash
yarn add @sprucelabs/sprucebot-llm
```

```bash
npm install @sprucelabs/sprucebot-llm
```

### Cloning and testing

To clone the repository and prepare for development, do the following:

```bash
git clone https://github.com/sprucelabsai/sprucebot-llm.git
cd sprucebot-llm
yarn rebuild
code .
```

### Testing in out
You can use `sprucebot-llm` inside any Javascript runtime (nodejs, bun, browser).

If you want to try this locally, you can checkout `chat.ts`. Here are the contents of that file for you to explore.

```ts
import { stdimport { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import dotenv from 'dotenv'
import OpenAiAdapter from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'
import buildCallbackSkill from './examples/buildCallbackSkill'
import buildFileTransformerSkill from './examples/buildFileTransformerSkill'
import buildJokeSkill from './examples/buildJokeSkill'
import buildProfileSkill from './examples/buildProfileSkill'
import buildReceptionistSkill from './examples/buildReceptionistSkill'
dotenv.config({ quiet: true })

const rl = readline.createInterface({ input, output })

void (async () => {
    console.clear()

    // Create the adapter that handles actually sending the prompt to an LLM
    const adapter = OpenAiAdapter.Adapter(process.env.OPEN_AI_API_KEY!)

    // The LLmFactory is a layer of abstraction that simplifies bot creation
    // and enables test doubling (mocks, spies, etc)
    const bots = SprucebotLlmFactory.Factory(adapter)

    // Different examples of things you may want to play with (see line 34)
    const skills = {
        jokes: buildJokeSkill(bots),
        profile: buildProfileSkill(bots),
        callbacks: buildCallbackSkill(bots),
        fileTransformer: buildFileTransformerSkill(bots),
        receptionist: buildReceptionistSkill(bots),
    }

    // Construct a Bot installs and pass the skill of your choice
    const bot = bots.Bot({
        skill: skills.callbacks, //<-- try jokes, profile, etc.
        youAre: "a bot named Sprucebot that is in test mode. At the start of every conversation, you introduce yourself and announce that you are in test mode so I don't get confused! You are both hip and adorable. You say things like, 'Jeepers' and 'Golly' or even 'Jeezey peezy'!",
    })

    do {
        // Read from stdin
        const input = await rl.question('Message > ')

        // Send the message to the bot and log the response
        // We use a callback because one message may trigger a conversation
        // which will include many messages and bot.sendMessage(...) only
        // returns the last message send back from the LLM
        await bot.sendMessage(input, (message) => console.log('>', message))
    } while (!bot.getIsDone())

    console.log('Signing off...')
    rl.close()
})()

```

### Conversation Memory

Conversation Memory is the total number of messages that will be tracked during a conversation. Once the limit is hit, old messages will be popped off the stack and forgotten. Currently, you can only configure memory through you project's .env:

```env
OPENAI_MESSAGE_MEMORY_LIMIT=10
```

> *Note*: OpenAI is currently the only adapter supported. If you would like to see support for other adapters (or programattic ways to configure convers), please open an issue and we'll get on it! 🤘

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

In this contrived example, you can see where you'd implement the callbacks for `availableTimes`, `favoriteColor`, and `book` to actually call the APIs and return the results.

```ts
const skill = bots.Skill({
	yourJobIfYouChooseToAcceptItIs:
		"to be the best appointment taker on the planet. You have a many years of experience. You are going to ask me only 2 questions for this practice run. First, you'll ask me to pick an available time. Then, you'll ask me to pick my favorite color (make sure to call the api to see what times and colors i can choose from). After all is said and done, make sure to actually book the appointment!:",
	weAreDoneWhen: 'the appointment is booked!',
	pleaseKeepInMindThat: [
		'people don\'t always know what they want, so be patient and guide them through the process.',
		'We have cancelled our coloring services, so if you\'re asked about them, tell the user we\'ve discontinued them.'
	],
	callbacks: {
		availableTimes: {
			cb: async () => {
				return [
					'9am',
					'10am',
					'11am',
					'1pm',
					'4pm',
					'5pm',
					'12am.',
				].join('\n')
			},
			useThisWhenever: 'your are showing what times i can pick from.',
		},
		favoriteColor: {
			cb: async () => {
				return ['red', 'blue', 'green', 'purple'].join('\n')
			},
			useThisWhenever:
				'your are showing what colors i can pick from.',
		},
		book: {
			cb: async (options) => {
				console.log('BOOKING OPTIONS', options)
				return 'Appointment booked!'
			},
			useThisWhenever: 'You are ready to book an appointment!',
			parameters: [
				{
					name: 'time',
					isRequired: true,
					type: 'string',
				},
				{
					name: 'color',
					isRequired: true,
					type: 'string',
				},
			],
		},
	},
})

```

### Choosing a model

When you configure a `Skill` with your bot, you can specify the model that the skill will use. In other words, you can have different skills use different models depending on their requirements.

```ts

const bookingSkill = bots.Skill({
	model: 'gpt-5',
	yourJobIfYouChooseToAcceptItIs: 'to tell knock knock jokes!',
	pleaseKeepInMindThat: [
		'our audience is younger, so keep it PG!',
		'you should never laugh when someone does not get the joke.',
		"after each joke, you should tell me how many jokes you have left to tell before we're done.",
		'you should acknowledge if someone laughs at your joke by saying "Thanks!" or "Glad you thought that was funny"!',
	],
	weAreDoneWhen: 'you have told 3 jokes!',
})

const bookingBot = bots.Bot({
	skill: bookingSkill,
	youAre: "a bot named Sprucebot that is in test mode. At the start of every conversation, you introduce yourself and announce that you are in test mode so I don't get confused! You are both hip and adorable. You say things like, 'Jeepers' and 'Golly' or even 'Jeezey peezy'!",
})

```