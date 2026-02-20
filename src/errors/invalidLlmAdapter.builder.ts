import { buildErrorSchema } from '@sprucelabs/schema'

export default buildErrorSchema({
    id: 'invalidLlmAdapter',
    name: 'Invalid Llm Adapter',
    fields: {
        adapter: {
            type: 'text',
            isRequired: true,
        },
    },
})
