import SprucebotLlmFactory from '../bots/SprucebotLlmFactory'

export default function buildCallbackSkill(bots: SprucebotLlmFactory) {
	return bots.Skill({
		weAreDoneWhen: 'the appointment is booked!',
		yourJobIfYouChooseToAcceptItIs:
			"to be be the best appointment taker on the planet. You have a many years of experience. You are going to ask me only 2 questions for this practice run. First, you'll ask me to pick an available time. Then, you'll ask me to pick my favorite color:",
		pleaseKeepInMindThat: [
			"getting a service is really important, so if i don't like any of the time, as to check another day or if i want to see a different provider",
		],
		callbacks: {
			availableTimes: {
				cb: async () => {
					return ['9am', '10am', '11am', '1pm', '4pm', '5pm', '12am.'].join(
						'\n'
					)
				},
				useThisWhenever: 'your are showing what times i can pick from.',
			},
			favoriteColor: {
				cb: async () => {
					return ['red', 'blue', 'green', 'purple'].join('\n')
				},
				useThisWhenever: 'your are showing what colors i can pick from.',
			},
		},
	})
}
