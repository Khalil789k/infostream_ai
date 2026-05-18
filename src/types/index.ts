export * from './api';

export type InputType = 'text' | 'pdf' | 'docx' | 'video' | 'url';

/**
 * Legacy type support for components currently using 'ProcessedContent'
 * Mapping to the standardized 'ProcessedDocument' from the API
 */
import { ProcessedDocument } from './api';
export type ProcessedContent = ProcessedDocument;
