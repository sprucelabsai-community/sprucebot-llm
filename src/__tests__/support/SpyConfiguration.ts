import { Configuration } from 'openai'

export default class SpyConfiguration extends Configuration {
	public static options?: Configuration
	public static instance?: SpyConfiguration
	public constructor(options: Configuration) {
		super()
		SpyConfiguration.options = options
		SpyConfiguration.instance = this
	}
}
