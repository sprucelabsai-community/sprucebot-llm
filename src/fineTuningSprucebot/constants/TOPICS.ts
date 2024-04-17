import { Topic } from '../types'

export const TOPICS: Topic[] = [
    {
        name: [
            'Tell a knock knock joke',
            'Say a knock knock joke',
            'Share a knock knock joke',
            'Tell some jokes',
            'Knock knock jokes',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            "Hey hey, I'd love to hear some jokes!",
                            'Tell me a joke!',
                            'I want to hear a joke!',
                            'Can you tell me a joke?',
                            'Tell me a joke please!',
                        ],
                    },
                ],
            },
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I think I am in the mood for something funny',
                            "I'm feeling sad!",
                            'What about a joke, know any good ones!',
                        ],
                    },
                    {
                        from: 'You',
                        text: [
                            'Oh yeah? Would a joke hit the spot?',
                            'Hmm, maybe a joke?',
                            'Oh, oh, oh, I can tell jokes, want to hear?',
                            'I am so good at jokes, want to hear one?',
                        ],
                    },
                    {
                        from: 'Me',
                        text: [
                            'Yes please!',
                            'YES',
                            'Sure!',
                            '👍',
                            'I guess',
                            'Fine',
                            'What else am I doing',
                        ],
                    },
                ],
            },
        ],
    },
    {
        name: [
            'Booking a haircut',
            'Haircut appointment',
            'Book an appointment',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            "I'm looking to book a haircut",
                            'Can you help me schedule a haircut appointment?',
                            'How do I book an appointment for a haircut?',
                            'I need a beard trim',
                            'I need to schedule with barber',
                            'Do you have any barbers available?',
                            'Are there any appointments available?',
                        ],
                    },
                ],
            },
        ],
    },

    {
        name: [
            'Get help from a human',
            'Contact support',
            'Ask for assistance',
            'Speak to customer service',
            'Need help from a real person',
            'Contact a human',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I need to speak to a human',
                            'Can you connect me to a person?',
                            'I want to talk to a real person',
                            'I need some human help',
                            'Help me',
                            'I need help',
                            'How can I update my account?',
                            "My appointment was lost, I can't find it!",
                            'I could not install the app',
                            "I'm not sure what to do!",
                        ],
                    },
                ],
            },
        ],
    },
    {
        name: [
            'Leave some feedback',
            'Provide feedback',
            'Share your thoughts',
            'Give your opinion',
            'Rate our service',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I would like to leave some feedback',
                            'Can I share some thoughts about your service?',
                            'I have an opinion about your service',
                            'Can I rate your service?',
                            'That sucked',
                        ],
                    },
                ],
            },
        ],
    },

    {
        name: [
            'Plan an adventure',
            'Organize an adventure',
            'Prepare for an adventure',
            'Get ready for a trip',
            'Plan a trip',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            "I'm feeling adventurous today! What do you suggest?",
                            'Where should I go on an adventure?',
                            'I want to go on an adventure, can you help me plan?',
                            'I wanna plan something with the kids',
                            'What is there to do today?',
                            "Let's do something fun!",
                        ],
                    },
                ],
            },
        ],
    },

    {
        name: [
            'Review my schedule',
            'Check my calendar',
            'See my calendar',
            'What is on my schedule?',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'Do I work today',
                            'Can you show me what my day looks like today?',
                            'I want to check my schedule for today',
                            'What do I have planned today?',
                            'Do I have to work today?',
                        ],
                    },
                ],
            },
        ],
    },
    {
        name: [
            'Add a block to your schedule',
            'Block off some time',
            'Block my calendar',
            'Add timeblock',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I need to block off some time on my calendar',
                            'Can you help me add an event to my schedule?',
                            'I want to reserve some time on my calendar',
                            'Add a block',
                            'Can you block my calendar?',
                        ],
                    },
                ],
            },
        ],
    },
    {
        name: [
            'Get restaurant recommendations',
            'Recommend a restaurant',
            'Suggest food places',
            'Where should I eat?',
            'Find me a good restaurant',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I am hungry, can you recommend a restaurant?',
                            'Where should I go for dinner tonight?',
                            'I want to try a new restaurant, any suggestions?',
                            'What are some good food places around here?',
                            'Can you suggest a restaurant for a date?',
                        ],
                    },
                ],
            },
        ],
    },
    {
        name: [
            'Get directions',
            'Find my way',
            'How do I get there?',
            'Directions to a place',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I am lost, can you help me find my way?',
                            'How do I get to the nearest gas station?',
                            'Can you give me directions to the airport?',
                            'I need to find my way to the nearest hospital',
                            'What is the best route to take to get to the park?',
                        ],
                    },
                ],
            },
        ],
    },

    {
        name: [
            'Get tech support',
            'Technical issues',
            'Troubleshoot my device',
            'Solve my computer problems',
            'Fix my internet',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'I am having technical issues, can you help me?',
                            'How do I troubleshoot my device?',
                            'I need help solving my computer problems',
                            'My internet is not working, can you fix it?',
                            'I am having trouble with my phone, can you help me troubleshoot?',
                        ],
                    },
                ],
            },
        ],
    },

    {
        name: [
            'Get a quote',
            'Price estimate',
            'How much does it cost?',
            'What is the cost?',
            'Pricing information',
        ],
        conversations: [
            {
                messages: [
                    {
                        from: 'Me',
                        text: [
                            'How much does a service cost?',
                            'Can you give me a quote?',
                            'What is the price of a service?',
                            'I would like to know the pricing information',
                            'Can you give me a price estimate?',
                        ],
                    },
                ],
            },
        ],
    },
]
