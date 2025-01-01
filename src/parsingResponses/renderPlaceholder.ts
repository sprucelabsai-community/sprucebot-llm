import { CALLBACK_BOUNDARY } from '../bots/templates'

export default function renderLegacyPlaceholder(key: string): string {
    return `${CALLBACK_BOUNDARY} ${key} ${CALLBACK_BOUNDARY}`
}
