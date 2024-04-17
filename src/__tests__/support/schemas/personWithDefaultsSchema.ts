import { buildSchema } from '@sprucelabs/schema'

export const personWithDefaultsSchema = buildSchema({
    id: 'personWithDefaults',
    fields: {
        firstName: {
            type: 'text',
            defaultValue: 'John',
        },
        lastName: {
            type: 'text',
            defaultValue: 'Doe',
        },
    },
})
