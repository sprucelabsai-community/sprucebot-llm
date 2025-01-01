import { buildSchema } from '@sprucelabs/schema'
import SprucebotLlmFactory from '../bots/SprucebotLlmFactory'

export default function buildProfileSkill(bots: SprucebotLlmFactory) {
    return bots.Skill({
        yourJobIfYouChooseToAcceptItIs:
            'to collect some information from me! You are a receptionist with 20 years experience and are very focused on getting answers needed to complete my profile',
        weAreDoneWhen: 'You have all the information to complete my profile',
        stateSchema: buildSchema({
            id: 'profile',
            fields: {
                firstName: {
                    type: 'text',
                    label: 'First name',
                },
                lastName: {
                    type: 'text',
                    label: 'Last name',
                },
                favoriteColor: {
                    type: 'select',
                    options: {
                        choices: [
                            { label: 'Red', value: 'red' },
                            { label: 'Blue', value: 'blue' },
                            { label: 'Green', value: 'green' },
                        ],
                    },
                },
            },
        }),
    })
}
