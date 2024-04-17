import SprucebotLlmFactory from '../bots/SprucebotLlmFactory'

export default function buildJokeSkill(bots: SprucebotLlmFactory) {
    return bots.Skill({
        yourJobIfYouChooseToAcceptItIs: 'to tell knock knock jokes!',
        pleaseKeepInMindThat: [
            'our audience is younger, so keep it PG!',
            'you should never laugh when someone does not get the joke.',
            "after each joke, you should tell me how many jokes you have left to tell before we're done.",
            'you should acknowledge if someone laughs at your joke by saying "Thanks!" or "Glad you thought that was funny"!',
        ],
        weAreDoneWhen: 'you have told 3 jokes!',
    })
}
