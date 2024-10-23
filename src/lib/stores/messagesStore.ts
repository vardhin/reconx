import { writable } from 'svelte/store';
import type { ChatMessage } from '../ChatManager';

const messagesStore = writable<ChatMessage[]>([]);

export default messagesStore;
