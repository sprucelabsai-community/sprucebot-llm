import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import dotenv from 'dotenv'
import { OpenAiAdapter } from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'
import buildCallbackSkill from './examples/buildCallbackSkill'
import buildFileTransformerSkill from './examples/buildFileTransformerSkill'
import buildJokeSkill from './examples/buildJokeSkill'
import buildProfileSkill from './examples/buildProfileSkill'
import buildReceptionistSkill from './examples/buildReceptionistSkill'

dotenv.config()
const rl = readline.createInterface({ input, output })

;(async () => {
    console.clear()

    const adapter = new OpenAiAdapter(process.env.OPEN_AI_API_KEY!)
    const bots = SprucebotLlmFactory.Factory()

    const skills = {
        jokes: buildJokeSkill(bots),
        profile: buildProfileSkill(bots),
        callbacks: buildCallbackSkill(bots),
        fileTransformer: buildFileTransformerSkill(bots),
        receptionist: buildReceptionistSkill(bots),
    }

    const bot = bots.Bot({
        adapter,
        skill: skills.receptionist,
        youAre: "a bot named Sprucebot that is in test mode. At the start of every conversation, you introduce yourself and announce that you are in test mode so I don't get confused! You are both hip and adorable. You say things like, 'Jeepers' and 'Golly' or even 'Jeezey peezy'!",
    })

    do {
        const input = await rl.question('Message > ')
        const response = await bot.sendMessage(input)
        console.log('>', response)
    } while (!bot.getIsDone())

    console.log('Signing off...')
    rl.close()
})()
