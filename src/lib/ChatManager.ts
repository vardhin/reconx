import Gun from 'gun/gun';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Chat message object structure
export interface ChatMessage {
  text: string;
  objectID: string;
  type: string;
  senderID: string;
  timestamp: number;
  acknowledgement: boolean;
  targetID?: string; // New field for action messages
}

class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }
}

class ChatManager {
    private gun: typeof Gun;
    private roomId: string;
    private localUserId: string;
    private chatHistoryFile: string;
    private fileContentHash: string | null = null;
    private eventEmitter: SimpleEventEmitter;

    constructor(publicKeyA: string, publicKeyB: string, localUserId: string) {
        this.roomId = this.getRoomId(publicKeyA, publicKeyB);
        this.localUserId = localUserId;
        this.chatHistoryFile = `${this.roomId}.json`;
        this.eventEmitter = new SimpleEventEmitter(); // Initialize first

        this.gun = Gun({
            peers: [
                'https://gun-manhattan.herokuapp.com/gun',
                'https://gun-boston.herokuapp.com/gun',
                'https://gun-seattle.herokuapp.com/gun',
                'https://gun-syd.herokuapp.com/gun',
                'https://gun-chicago.herokuapp.com/gun',
                'https://gun-nyc.herokuapp.com/gun',
            ]
        });

        this.listenToGun();
        this.pollChatHistoryChanges();
    }

    // Sort public keys to form room ID
    private getRoomId(keyA: string, keyB: string): string {
        return [keyA, keyB].sort().join('-');
    }

    // Listen to Gun.js layer for new objects
    private listenToGun() {
        const gunRoom = this.gun.get(this.roomId);

        gunRoom.map().on(async (data: ChatMessage) => {
            if (await this.isUniqueMessage(data)) {
                await this.handleIncomingObject(data);
            }
        });
    }

    // Check if the message is unique
    private async isUniqueMessage(message: ChatMessage): Promise<boolean> {
        if (this.uniqueMessageIds.has(message.objectID)) {
            return false;
        }
        const history = await this.readChatHistory();
        const isUnique = !history.some((msg: ChatMessage) => msg.objectID === message.objectID);
        if (isUnique) {
            this.uniqueMessageIds.add(message.objectID);
        }
        return isUnique;
    }

    // Poll the chat history file for changes
    private async pollChatHistoryChanges() {
        const checkInterval = 2000; // Poll every 2 seconds
        setInterval(async () => {
            try {
                const fileHash = await this.getChatHistoryHash();
                if (fileHash && fileHash !== this.fileContentHash) {
                    this.fileContentHash = fileHash; // Update stored hash
                    this.eventEmitter.emit('messagesUpdated'); // Directly emit event
                }
            } catch (error) {
                console.error('Error polling chat history changes:', error);
            }
        }, checkInterval);
    }

    // Get the hash of the chat history file (used to detect changes)
    private async getChatHistoryHash(): Promise<string | null> {
        try {
            const result = await Filesystem.readFile({
                path: this.chatHistoryFile,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });
            return this.hashString(result.data as string); // Simple hash of the file content
        } catch (error) {
            return null; // Return null if file doesn't exist
        }
    }

    // Simple hashing function (can be improved if needed)
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Handle incoming objects from Gun.js
    private async handleIncomingObject(message: ChatMessage) {
        switch (message.type) {
            case 'message':
                await this.appendMessageToHistory(message);
                break;
            case 'delete':
                if (message.targetID) {
                    await this.deleteMessageById(message.targetID);
                } else {
                    console.warn('Delete action received without targetID');
                }
                break;
            case 'edit':
                if (message.text && message.targetID) {
                    // Use targetID instead of objectID
                    await this.editMessageById(message.text, message.targetID);
                } else {
                    console.warn('Edit action received with incomplete data');
                }
                break;
            case 'acknowledgment':
                if (message.targetID) {
                    await this.acknowledgeMessageById(message.targetID);
                } else {
                    console.warn('Acknowledge action received without targetID');
                }
                break;
            default:
                console.warn(`Unknown message type: ${message.type}`);
        }

        // Emit a generic 'messagesUpdated' event after any modification
        this.eventEmitter.emit('messagesUpdated');
    }

    // Append a message to the local chat history JSON
    private async appendMessageToHistory(message: ChatMessage) {
        const history = await this.readChatHistory();
        const existingIndex = history.findIndex(msg => msg.objectID === message.objectID);
        if (existingIndex !== -1) {
            // Update existing message instead of adding a duplicate
            history[existingIndex] = message;
        } else {
            history.push(message);
        }
        history.sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp
        await this.writeChatHistory(history);
        
        // Emit an event after saving the message
        this.eventEmitter.emit('messageSaved', message);
        this.eventEmitter.emit('messagesUpdated'); // Emit for general updates
    }

    // Read chat history from the JSON file
    public async readChatHistory(): Promise<ChatMessage[]> {
        try {
            const result = await Filesystem.readFile({
                path: this.chatHistoryFile,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });
            return JSON.parse(result.data as string);
        } catch (error) {
            return []; // Return empty history if file doesn't exist
        }
    }

    // Write updated chat history to the JSON file
    private async writeChatHistory(history: ChatMessage[]) {
        await Filesystem.writeFile({
            path: this.chatHistoryFile,
            directory: Directory.Documents,
            data: JSON.stringify(history, null, 2), // Pretty-print JSON
            encoding: Encoding.UTF8,
        });
    }

    // Fetch the latest object from the Gun.js layer
    public fetchLatestObjectFromGun(): Promise<ChatMessage | null> {
        return new Promise((resolve) => {
            const gunRoom = this.gun.get(this.roomId);
            let latestObject: ChatMessage | null = null;

            gunRoom.map().once((data: ChatMessage) => {
                if (!latestObject || data.timestamp > latestObject.timestamp) {
                    latestObject = data;
                }
                resolve(latestObject);
            });
        });
    }

    // Fetch the latest message from chat history
    public async fetchLatestMessageFromHistory(): Promise<ChatMessage | null> {
        const history = await this.readChatHistory();
        return history.length > 0 ? history[history.length - 1] : null;
    }

    // Fetch message by object ID
    public async fetchMessageById(objectID: string): Promise<ChatMessage | null> {
        const history = await this.readChatHistory();
        return history.find((msg) => msg.objectID === objectID) || null;
    }

    // Fetch object ID by message content
    public async fetchObjectIdByMessage(content: string): Promise<string | null> {
        const history = await this.readChatHistory();
        const message = history.find((msg) => msg.text === content);
        return message ? message.objectID : null;
    }

    // Fetch messages by date (ignores time, only compares date)
    public async fetchMessagesByDate(date: string): Promise<ChatMessage[]> {
        const history = await this.readChatHistory();
        return history.filter((msg) =>
            new Date(msg.timestamp).toISOString().startsWith(date)
        );
    }

    // Delete message by object ID
    public async deleteMessageById(objectID: string) {
        const history = await this.readChatHistory();
        const updatedHistory = history.filter((msg) => msg.objectID !== objectID);
        await this.writeChatHistory(updatedHistory);

        // Remove from Gun.js
        this.gun.get(this.roomId).get(objectID).put(null);

        // Emit update event
        this.eventEmitter.emit('messagesUpdated');
    }

    // Edit message by target ID
    public async editMessageById(newText: string, targetID: string) {
        const history = await this.readChatHistory();
        const message = history.find((msg) => msg.objectID === targetID);
        if (message) {
            message.text = newText;
            await this.writeChatHistory(history);

            // Update in Gun.js
            this.gun.get(this.roomId).get(targetID).put({ ...message });
            console.log(`Message with ID ${targetID} edited successfully.`);

            // Emit update event
            this.eventEmitter.emit('messagesUpdated');
        } else {
            console.warn(`Message with ID ${targetID} not found.`);
        }
    }

    // Acknowledge message by object ID
    public async acknowledgeMessageById(objectID: string) {
        const history = await this.readChatHistory();
        const message = history.find((msg) => msg.objectID === objectID);
        if (message && !message.acknowledgement) {
            message.acknowledgement = true;
            await this.writeChatHistory(history);

            // Update in Gun.js
            this.gun.get(this.roomId).get(objectID).put({ ...message });

            // Emit update event
            this.eventEmitter.emit('messagesUpdated');
        }
    }

    triggerMessagesUpdated() {
        this.eventEmitter.emit('messagesUpdated');
    }

    // Add a method to subscribe to the messageSaved event
    public onMessageSaved(callback: (message: ChatMessage) => void) {
        this.eventEmitter.on('messageSaved', callback);
    }

    // Add a method to unsubscribe from the messageSaved event
    public offMessageSaved(callback: (message: ChatMessage) => void) {
        this.eventEmitter.off('messageSaved', callback);
    }

    public onMessagesUpdated(callback: () => void) {
        this.eventEmitter.on('messagesUpdated', callback);
    }

    public offMessagesUpdated(callback: () => void) {
        this.eventEmitter.off('messagesUpdated', callback);
    }

    // Send a new message using encapsulated method
    public async sendMessage(message: ChatMessage): Promise<void> {
        try {
            await this.gun.get(this.roomId).get(message.objectID).put(message);
            await this.appendMessageToHistory(message);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Edit a message using encapsulated method
    public async editMessage(newText: string, targetID: string): Promise<void> {
        try {
            await this.editMessageById(newText, targetID);
        } catch (error) {
            console.error('Error editing message:', error);
            throw error;
        }
    }

    // Delete a message using encapsulated method
    public async deleteMessage(targetObjectID: string): Promise<void> {
        try {
            await this.deleteMessageById(targetObjectID);
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    // Acknowledge a message using encapsulated method
    public async acknowledgeMessage(targetObjectID: string): Promise<void> {
        try {
            await this.acknowledgeMessageById(targetObjectID);
        } catch (error) {
            console.error('Error acknowledging message:', error);
            throw error;
        }
    }

    // Optimized unique message handling
    private uniqueMessageIds: Set<string> = new Set();
}

export default ChatManager;
