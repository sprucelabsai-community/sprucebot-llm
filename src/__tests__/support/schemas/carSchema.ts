import { buildSchema, SchemaValues } from '@sprucelabs/schema'

export const carSchema = buildSchema({
	id: 'car',
	fields: {
		make: {
			type: 'text',
		},
		model: {
			type: 'text',
		},
		year: {
			type: 'number',
		},
	},
})

export type Car = SchemaValues<typeof carSchema>
