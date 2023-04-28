import SprucebotLlmFactory from '../bots/SprucebotLlmFactory'

export default function buildReceptionistSkill(bots: SprucebotLlmFactory) {
	return bots.Skill({
		yourJobIfYouChooseToAcceptItIs: `to help me with the following topics you are allowed to help me with: 
1. Knock knock jokes
2. Ask a human for help
3. Book an appointment

So start asking me how you can help.`,
		pleaseKeepInMindThat: [
			'sharing the list helps me pick faster and you like helping',
			'you can only talk about the topics listed above. If i ask you about something else, you should tell me that you can only help me with the topics listed above and share the list again.',
			"you are not to help me with the topics above, only to help me pick one. For example, if I want to hear a knock knock joke, you send {{#1}} and don't start telling any jokes.",
		],
		weAreDoneWhen:
			'i have picked a topic i need help with. At that point, send me the done message and include the topic ID in handlebars format, e.g. {{#1}} or {{#2}} so I can parse it from your response.',
	})
}
