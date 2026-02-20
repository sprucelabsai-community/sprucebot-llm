import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceErrors } from '../errors.types'



const invalidLlmAdapterSchema: SpruceErrors.SprucebotLlm.InvalidLlmAdapterSchema  = {
	id: 'invalidLlmAdapter',
	namespace: 'SprucebotLlm',
	name: 'Invalid Llm Adapter',
	    fields: {
	            /** . */
	            'adapter': {
	                type: 'text',
	                isRequired: true,
	                options: undefined
	            },
	    }
}

SchemaRegistry.getInstance().trackSchema(invalidLlmAdapterSchema)

export default invalidLlmAdapterSchema
