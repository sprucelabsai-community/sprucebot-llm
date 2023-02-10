# sprucebot-llm (WIP)
A Typescript library for leveraging Large Langage Models (like GPT-3) to do... anything!

* Has memory
    * Remembers past messages to build context
    * Configure how much of the conversation your bot should remember*
* Manages state
    * The state builds as the conversation continues
    * Invoke callbacks whenever state changes*
* Connect to 3rd party API's*
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

Create a file called `chat.ts` and add the following to get started:

```ts
import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import dotenv from 'dotenv'
import { OpenAi } from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'

dotenv.config()

const adapter = new OpenAi(process.env.OPEN_AI_API_KEY)
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

```