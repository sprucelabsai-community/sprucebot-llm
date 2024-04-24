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




