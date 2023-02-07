# sprucebot-llm
A Typescript library for leveraging Large Langage Models (like GPT-3) to do... anything!

* Has memory
    * Remembers past messages to build context
    * 
* Manages state
* Connect to 3rd party API's
* Unlimited use cases
* Only support GPT-3 for now (more adapters based on demand)
* Fully typed

## Getting started

Install the library

```bash
yarn add @sprucelabs/sprucebot-llm
```

Building your first bot

```ts
// chat.ts

import dotenv from 'dotenv'
import { OpenAi } from './bots/adapters/OpenAi'

dotenv.config()

const adapter = new OpenAi(process.env.OPEN_AI_API_KEY)
const bots = SprucebotLlmFactory.Factory()
const bot = bots.Bot({
    adapter,
    youAre: `a bot named Sprucebot. You are in test mode, so don't forget to let me know while we're chatting!`,
})

const skill = SprucebotLlmFactory.Skill({
    yourJobIfYouChooseToAcceptItIs: 'to tell me funny knock knock jokes.',
    pleaseKeepInMindThat: [
        `you are never supposed to laugh when someone does't get your jokes.`,
        `the audience for this can be anyone, so keep it PG.`
    ],
    weAreDoneWhen: `I say I don't want to hear anymore jokes.`
})

bot.setSkill(skill)

do {
    const input = await rl.question('Message > ')
    const response = await bot.sendMessage(input)
    console.log('>', response)
} while (!bot.getIsDone())

```