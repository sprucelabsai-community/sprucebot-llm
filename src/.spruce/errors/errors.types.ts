import { default as SchemaEntity } from '@sprucelabs/schema'
import * as SpruceSchema from '@sprucelabs/schema'







export declare namespace SpruceErrors.SprucebotLlm {

	
	export interface NoBotInstanceSet {
		
	}

	export interface NoBotInstanceSetSchema extends SpruceSchema.Schema {
		id: 'noBotInstanceSet',
		namespace: 'SprucebotLlm',
		name: 'No bot instance set',
		    fields: {
		    }
	}

	export type NoBotInstanceSetEntity = SchemaEntity<SpruceErrors.SprucebotLlm.NoBotInstanceSetSchema>

}


export declare namespace SpruceErrors.SprucebotLlm {

	
	export interface InvalidCallback {
		
			
			'validCallbacks': string[]
			
			'matchedCallback': string
	}

	export interface InvalidCallbackSchema extends SpruceSchema.Schema {
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

	export type InvalidCallbackEntity = SchemaEntity<SpruceErrors.SprucebotLlm.InvalidCallbackSchema>

}


export declare namespace SpruceErrors.SprucebotLlm {

	
	export interface CallbackError {
		
	}

	export interface CallbackErrorSchema extends SpruceSchema.Schema {
		id: 'callbackError',
		namespace: 'SprucebotLlm',
		name: 'Callback error',
		    fields: {
		    }
	}

	export type CallbackErrorEntity = SchemaEntity<SpruceErrors.SprucebotLlm.CallbackErrorSchema>

}




