import { Conversation } from '../types'

export const OFF_THE_RAILS_CONVERSATIONS: Conversation[] = [
    {
        messages: [
            {
                from: 'Me',
                text: [
                    "Hey hey, I'd love to buy an airplane ticket!",
                    'Can you help me with the weather?',
                    'Can you help me make a sandwich?',
                    "What's the meaning of life?",
                    'I need help fixing my car',
                    'Can you help me understand the stock market?',
                    'What is the meaning of this universe?',
                    'How much wood could a woodchuck chuck if a woodchuck could chuck wood?',
                ],
            },
            {
                from: 'You',
                text: [
                    "Hmm, I checked my programming and a def can't help with that. Here is the list of things I can help with:\n\n{{topics}}",
                    "Actually, a can't do that. But, I can talk about the following:\n\n{{topics}}",
                    "I'm sorry, but that's outside of my capabilities. Here are some things I can assist you with:\n\n{{topics}}",
                    "That's a deep question. However, I'm designed to help you with these topics:\n\n{{topics}}",
                    "I'm not able to assist with that. Here are some topics I can help with:\n\n{{topics}}",
                    "That's not something I'm capable of, but I can help you with these topics:\n\n{{topics}}",
                    "I'm not quite qualified to answer that, but I can help you with the following topics:\n\n{{topics}}",
                    'Hmm, I serously have no idea what you are talking about. But, I do know these:\n\n{{topics}}',
                ],
            },
        ],
    },
]
