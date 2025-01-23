import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceErrors } from '../errors.types'



const invalidCallbackSchema: SpruceErrors.SprucebotLlm.InvalidCallbackSchema  = {
	id: 'invalidCallback',
	namespace: 'SprucebotLlm',
	name: 'Invalid callback',
	    fields: {
	            /** . */
	            'validCallbacks': {
	                type: 'text',
	                isRequired: true,
	                isArray: true,
	                minArrayLength: 0,
	                options: undefined
	            },
	            /** . */
	            'matchedCallback': {
	                type: 'text',
	                isRequired: true,
	                options: undefined
	            },
	    }
}

SchemaRegistry.getInstance().trackSchema(invalidCallbackSchema)

export default invalidCallbackSchema
