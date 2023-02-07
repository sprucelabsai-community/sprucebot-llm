# sprucebot-llm
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
* Unlimited use cases*
    * Skill architecture for extensibility
    * Tune Skills to do any job
* Only support GPT-3 for now (more adapters based on demand)
    * Adapter Interface to create your own adapters
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

const skill = SprucebotLlmFactory.Skill({
    yourJobIfYouChooseToAcceptItIs: 'to tell me funny knock knock jokes.',
    pleaseKeepInMindThat: [
        `you are never supposed to laugh when someone does't get your jokes.`,
        `the audience for this can be anyone, so keep it PG.`
    ],
    weAreDoneWhen: `I say I don't want to hear anymore jokes.`
})

const bot = bots.Bot({
    adapter,
    youAre: `a bot named Sprucebot. You are in test mode, so don't forget to let me know while we're chatting!`,
    skill,
})

do {
    const input = await rl.question('Message > ')
    const response = await bot.sendMessage(input)
    console.log('>', response)
} while (!bot.getIsDone())

```