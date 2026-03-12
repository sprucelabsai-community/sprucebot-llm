import {
    Schema,
    SchemaFieldNames,
    SchemaFieldDefinition,
    validateSchemaValues,
    normalizeSchemaValues,
} from '@sprucelabs/schema'
import { LlmCallbackParameter } from '../llm.types'

export default function validateAndNormalizeCallbackOptions(
    parameters: LlmCallbackParameter[],
    options: Record<string, any>
) {
    const schema: Schema = {
        id: 'validationSchema',
        fields: {},
    }

    ;(parameters ?? []).forEach((param) => {
        const { name, ...rest } = param
        schema.fields![name as SchemaFieldNames<Schema>] =
            rest as SchemaFieldDefinition<Schema, never>
    })

    validateSchemaValues(schema, options)
    options = normalizeSchemaValues(schema, options)
    return options
}
