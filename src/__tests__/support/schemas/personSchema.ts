import { buildSchema } from '@sprucelabs/schema'

export const personSchema = buildSchema({
    id: 'person',
    fields: {
        firstName: {
            type: 'text',
            label: 'First name',
        },
        lastName: {
            type: 'text',
            label: 'Last names',
        },
        favoriteColor: {
            type: 'select',
            options: {
                choices: [
                    {
                        label: 'Red',
                        value: 'red',
                    },
                    {
                        label: 'Green',
                        value: 'green',
                    },
                    {
                        label: 'Blue',
                        value: 'blue',
                    },
                ],
            },
        },
    },
})

export type PersonSchema = typeof personSchema
