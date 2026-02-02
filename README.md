# Sprucebot LLM
A TypeScript library for leveraging large language models to do... anything!

* [Has memory](#message-history-and-context-limits)
    * Remembers past messages to build context
    * Configure how much of the conversation your bot should remember
* [Manages state](#adding-state-to-your-conversation)
    * The state builds as the conversation continues
    * Invoke callbacks whenever state changes
* [Connect to 3rd party APIs](#pulling-from-3rd-party-apis)
    * Pull in data in real time
    * Have your bot respond generated responses
* Unlimited use cases
    * Skill architecture for extensibility
    * Leverage Skills to get your bot to complete any task!
* Adapter interface to create your own adapters
    * Only support OpenAI models for now (more adapters based on demand)
* Fully typed
	* Built in modern TypeScript
	* Fully typed schema-based state management (powered by `@sprucelabs/schema`)


## Lexicon

- `Bot`: This is the abstraction that holds the agent's personality.
- `Skill`: Describes what the `Bot` is responsible for doing and how to do it (including tool integration).

## Getting started

### Install the library as a dependency

```bash
yarn add @sprucelabs/sprucebot-llm
```

```bash
npm install @sprucelabs/sprucebot-llm
```

### Cloning and testing directly

To clone the repository and prepare for development, do the following:

```bash
git clone https://github.com/sprucelabsai/sprucebot-llm.git
cd sprucebot-llm
yarn rebuild
code .
```

### Testing it out for yourself
You can use `sprucebot-llm` inside any JavaScript runtime (Node.js, Bun, browser).

If you want to try this locally, you can checkout `chat.ts`. Create a `.env` file with your OpenAI API key first:

```env
OPEN_AI_API_KEY=your_api_key_here
```

Here are the contents of that file for you to review now, rather than needing to explore the codebase.

```ts
import { stdin as input, stdout as output } from 'node:process'
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

    // The LlmFactory is a layer of abstraction that simplifies bot creation
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

    // Construct a Bot and pass the skill of your choice
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

### Message history and context limits

There are two different limits to be aware of:

- `SprucebotLlmBotImpl.messageMemoryLimit` (default: `10`) controls how many messages are kept in the in-memory history on the Bot. Once the limit is hit, old messages are dropped and can no longer be sent to any adapter.
- `OPENAI_MESSAGE_MEMORY_LIMIT` or `OpenAiAdapter.setMessageMemoryLimit(limit)` controls how many of those tracked messages are included when sending a request to OpenAI. `0` (the default) means "no additional limit" beyond the Bot history.

To change the Bot history limit:

```ts
import { SprucebotLlmBotImpl } from '@sprucelabs/sprucebot-llm'

SprucebotLlmBotImpl.messageMemoryLimit = 20
```

Additional OpenAI context controls:

- `OPENAI_PAST_MESSAGE_MAX_CHARS` omits *past* (non-latest) messages longer than the limit, replacing them with `[omitted due to length]`.
- `OPENAI_SHOULD_REMEMBER_IMAGES=false` omits images from older messages to save context, keeping only the most recent image and replacing older ones with `[Image omitted to save context]`.

> *Note*: OpenAI is currently the only adapter supported. If you would like to see support for other adapters (or programmatic ways to configure memory), please open an issue and we'll get on it!

### OpenAI adapter configuration

Required environment variable:

```env
OPEN_AI_API_KEY=your_api_key_here
```

Optional environment variables:

```env
OPENAI_MESSAGE_MEMORY_LIMIT=0
OPENAI_PAST_MESSAGE_MAX_CHARS=0
OPENAI_SHOULD_REMEMBER_IMAGES=true
OPENAI_REASONING_EFFORT=low
```

Runtime configuration options:

```ts
const adapter = OpenAiAdapter.Adapter(process.env.OPEN_AI_API_KEY!, {
	log: console,
})

adapter.setModel('gpt-4o')
adapter.setMessageMemoryLimit(10)
adapter.setReasoningEffort('low')
```

### OpenAI adapter API

`OpenAiAdapter` exposes the following API:

- `OpenAiAdapter.Adapter(apiKey, options?)`: create an adapter instance. `options.log` can be any logger that supports `.info(...)`.
- `adapter.setModel(model)`: set a default model for all requests unless a Skill overrides it.
- `adapter.setMessageMemoryLimit(limit)`: limit how many tracked messages are sent to OpenAI.
- `adapter.setReasoningEffort(effort)`: set `reasoning_effort` for models that support it.
- `OpenAiAdapter.OpenAI`: assign a custom OpenAI client class (useful for tests).

Requests are sent via `openai.chat.completions.create(...)` with messages built by the adapter from the Bot state and history.

### Custom adapters

You can bring your own adapter by implementing the `LlmAdapter` interface and passing it to `SprucebotLlmFactory.Factory(...)`:

```ts
import {
	LlmAdapter,
	SprucebotLlmBot,
	SprucebotLlmFactory,
} from '@sprucelabs/sprucebot-llm'

class MyAdapter implements LlmAdapter {
	async sendMessage(bot: SprucebotLlmBot) {
		// Build your prompt from the bot's serialized state or messages
		const { messages } = bot.serialize()
		// Send to your model and return the model response as a string
		return `echo: ${messages[messages.length - 1]?.message ?? ''}`
	}
}

const bots = SprucebotLlmFactory.Factory(new MyAdapter())
```

### Adding state to your conversation
This library depends on `@sprucelabs/schema` to handle the structure and validation rules around your state.
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

### Listening for state changes

If you supply a `stateSchema`, then your bot will work with it based on the job you decide to give it. While the conversation is taking place, if the state changes:

- If the state is on the Bot (you passed `stateSchema` to `bots.Bot(...)`), the Bot emits `did-update-state`.
- If the state is on the Skill (you passed `stateSchema` to `bots.Skill(...)`), the Skill emits `did-update-state`.

```ts
await skill.on('did-update-state', () => {
	console.log('we are making progress!')
	console.log(JSON.stringify(this.skill.getState()))
})

```
### Pulling from 3rd party APIs

The approach to integrating 3rd party APIs (as well as dropping in other dynamic data into responses) is straightforward.

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

#### Callback invocation format
When using the `OpenAiAdapter`, the model is instructed to call callbacks using one of these formats:

```text
<<functionName/>>
<<functionName>>{"param":"value"}<</functionName>>
```

Only one callback invocation per model response is supported. Callbacks can return either a `string` or an image message shaped like `{ imageBase64, imageDescription }` (see the "Sending images" section below).

Legacy placeholder format (`xxxxx callbackName xxxxx`) is still supported by the response parser for older prompt templates.

Callback parameters can include basic types (e.g. `text`, `number`, `boolean`, `dateMs`, `dateTimeMs`) and `select` fields with choices from `@sprucelabs/schema`.

> *Note*: This is not MCP (Model Context Protocol). MCP is focused on making APIs available to LLMs. `sprucebot-llm` comes at this from the opposite direction. It does not require you to do anything server-side, so you can connect to all your existing endpoints/tools/systems without needing to change them.

### Sending images

You can send images to the bot by passing a base64-encoded image and a short description:

```ts
await bot.sendMessage({
	imageBase64: base64Png,
	imageDescription: 'A photo of a sunset over the mountains.',
})
```

There is a working example at `src/chatWithImages.ts`, and you can run it after building with:

```bash
yarn chat.images
```

### Choosing a model

When you configure a `Skill` for a bot, you can specify the model that the skill will use. In other words, you can have different skills use different models depending on their requirements. The OpenAI adapter defaults to `gpt-4o`, and a `Skill` model (if set) overrides the adapter default.

```ts

const bookingSkill = bots.Skill({
	model: 'gpt-4o',
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

If you are using reasoning models that accept `reasoning_effort`, you can set it via `OPENAI_REASONING_EFFORT` or `adapter.setReasoningEffort(...)`.

### Bot and Skill API highlights

Common Bot methods:

- `sendMessage(message, cb?)`: Send a user message (string or `{ imageBase64, imageDescription }`). The optional callback is invoked for each model response, including follow-up responses after a callback/tool result is injected.
- `getIsDone()` / `markAsDone()`: Check or force completion.
- `clearMessageHistory()`: Drop all tracked messages.
- `updateState(partialState)`: Update state and emit `did-update-state`.
- `setSkill(skill)`: Swap the active skill.
- `serialize()`: Snapshot of the bot's current state, skill, and history.

Common Skill methods:

- `updateState(partialState)`, `getState()`
- `setModel(model)`
- `serialize()`

### Factory helpers

`SprucebotLlmFactory` also exposes:

- `setBotInstance(bot)` and `getBotInstance()` for storing a single bot instance.
- `SprucebotLlmFactory.BotClass`, `.SkillClass`, `.FactoryClass` overrides for dependency injection in tests.
- `SprucebotLlmFactory.reset()` to restore defaults.

### Errors

`SprucebotLlmError` is exported for structured error handling. Common error codes include:

- `NO_BOT_INSTANCE_SET`
- `INVALID_CALLBACK`
- `CALLBACK_ERROR`

### Testing utilities

These are exported from the package for unit tests:

- `SpyLlmAdapter`: captures the last bot and options passed to the adapter.
- `SpyLllmBot`: records constructor options and exposes message history helpers. (Note: the export name currently has three "l"s.)
- `MockLlmSkill`: adds assertion helpers for skill configuration and callbacks.
- `SpyOpenAiApi`: a drop-in `OpenAI` client stub for adapter tests. Set `OpenAiAdapter.OpenAI = SpyOpenAiApi` before constructing the adapter.

### Development scripts

Useful commands from `package.json`:

- `yarn test`
- `yarn build.dev`
- `yarn build.dist`
- `yarn chat`
- `yarn chat.images`
- `yarn generate.samples`
