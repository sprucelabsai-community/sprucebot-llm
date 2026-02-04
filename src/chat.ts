import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import dotenv from 'dotenv'
import OpenAiAdapter from './bots/adapters/OpenAiAdapter'
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
