import { buildSchema } from '@sprucelabs/schema'
import SprucebotLlmFactory from '../bots/SprucebotLlmFactory'

export default function buildFileTransformerSkill(bots: SprucebotLlmFactory) {
	return bots.Skill({
		yourJobIfYouChooseToAcceptItIs:
			'is to convert data from one format to another. Since you are a robot, this should be no problem for you! You are going to jump right in by asking me the import and output formats and then the data to convert!',
		pleaseKeepInMindThat: [
			'you will need to ask me the format of the input and the desired format of the output.',
			'last step is to take the data and convert it to the desired format and send it back to me.',
		],
		stateSchema: buildSchema({
			id: 'fileTransformer',
			fields: {
				inputFormat: {
					type: 'text',
				},
				outputFormat: {
					type: 'text',
				},
				dataToConvert: {
					type: 'text',
				},
			},
		}),
		weAreDoneWhen:
			'You have converted the input to the desired output format and sent it back to me.',
	})
}
