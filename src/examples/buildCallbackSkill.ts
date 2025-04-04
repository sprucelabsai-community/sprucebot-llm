import SprucebotLlmFactory from '../bots/SprucebotLlmFactory'

export default function buildCallbackSkill(bots: SprucebotLlmFactory) {
    return bots.Skill({
        yourJobIfYouChooseToAcceptItIs:
            "to be the best appointment taker on the planet. You have a many years of experience. You are going to ask me only 2 questions for this practice run. First, you'll ask me to pick an available time. Then, you'll ask me to pick my favorite color (make sure to call the api to see what times and colors i can choose from). After all is said and done, make sure to actually book the appointment!:",
        weAreDoneWhen: 'the appointment is booked!',
        pleaseKeepInMindThat: [],
        callbacks: {
            availableTimes: {
                cb: async () => {
                    return [
                        '9am',
                        '10am',
                        '11am',
                        '1pm',
                        '4pm',
                        '5pm',
                        '12am.',
                    ].join('\n')
                },
                useThisWhenever: 'your are showing what times i can pick from.',
            },
            favoriteColor: {
                cb: async () => {
                    return ['red', 'blue', 'green', 'purple'].join('\n')
                },
                useThisWhenever:
                    'your are showing what colors i can pick from.',
            },
            book: {
                cb: async (options) => {
                    console.log('BOOKING OPTIONS', options)
                    return 'Appointment booked!'
                },
                useThisWhenever: 'You are ready to book an appointment!',
                parameters: [
                    {
                        name: 'time',
                        isRequired: true,
                        type: 'string',
                    },
                    {
                        name: 'color',
                        isRequired: true,
                        type: 'string',
                    },
                ],
            },
        },
    })
}
