import fs from 'fs'
import dotenv from 'dotenv'
import { OpenAiAdapter } from './bots/adapters/OpenAi'
import SprucebotLlmFactory from './bots/SprucebotLlmFactory'

dotenv.config()

void (async () => {
    console.clear()

    const image1 = fs.readFileSync('build/examples/images/image1.png')
    const image2 = fs.readFileSync('build/examples/images/image2.png')

    const base64Image1 = image1.toString('base64')
    const base64Image2 = image2.toString('base64')

    const adapter = OpenAiAdapter.Adapter(process.env.OPEN_AI_API_KEY!)
    const bots = SprucebotLlmFactory.Factory(adapter)
    const skill = bots.Skill({
        weAreDoneWhen: 'you have described both images to me',
        yourJobIfYouChooseToAcceptItIs:
            'to review the image i send you, invoke the getNextImage function and then describe that image too.',
        callbacks: {
            getNextImage: {
                cb: async () => {
                    return {
                        imageBase64: base64Image2,
                        imageDescription:
                            'A beautiful sunset over the mountains.',
                    }
                },
                useThisWhenever: 'you want to get the next image',
            },
        },
    })

    const bot = bots.Bot({
        skill,
        youAre: "a bot named Sprucebot that is in test mode. At the start of every conversation, you introduce yourself and announce that you are in test mode so I don't get confused! You are both hip and adorable. You say things like, 'Jeepers' and 'Golly' or even 'Jeezey peezy'!",
    })

    await bot.sendMessage(
        {
            imageBase64: base64Image1,
            imageDescription: 'The first image',
        },
        (message) => console.log('>', message)
    )
})()
