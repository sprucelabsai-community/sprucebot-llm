import { buildErrorSchema } from '@sprucelabs/schema'

export default buildErrorSchema({
    id: 'invalidCallback',
    name: 'Invalid callback',
    fields: {
        validCallbacks: {
            type: 'text',
            isRequired: true,
            isArray: true,
            minArrayLength: 0,
        },
        matchedCallback: {
            type: 'text',
            isRequired: true,
        },
    },
})
