import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Save a message to the chat history
export async function saveMessage(
	message,
	messageID,
	type,
	yourID,
	acknowledgment,
	friendName,
	timestamp
) {
	const path = `contacts/${friendName}/chat_history.json`;

	try {
		// Check if the file exists and read its content
		let fileContents = '';
		try {
			const result = await Filesystem.readFile({
				path: path,
				directory: Directory.Documents,
				encoding: Encoding.UTF8
			});
			fileContents = result.data;
		} catch (error) {
			// File doesn't exist, initialize with an empty object
			fileContents = '{}';
		}

		// Parse the chat history and add the new message
		const chatHistory = JSON.parse(fileContents);
		const newMessageKey = `object${Object.keys(chatHistory).length + 1}`;
		chatHistory[newMessageKey] = {
			message: message,
			messageID: messageID,
			type: type,
			yourID: yourID,
			timestamp: timestamp,
			acknowledgment: acknowledgment
		};

		// Write the updated chat history back to the file
		await Filesystem.writeFile({
			path: path,
			data: JSON.stringify(chatHistory, null, 2), // Pretty-print JSON
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		console.log('Message saved successfully!');
	} catch (error) {
		console.error('Error saving message:', error);
	}
}

// Fetch chat history for a specific friend
export async function fetchChatHistory(friendName) {
	const path = `contacts/${friendName}/chat_history.json`;

	try {
		const result = await Filesystem.readFile({
			path: path,
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		const chatHistory = JSON.parse(result.data);
		return chatHistory;
	} catch (error) {
		console.error('Error fetching chat history:', error);
		return null;
	}
}

// Fetch the latest message for a specific friend
export async function fetchLatestMessage(friendName) {
	const path = `contacts/${friendName}/chat_history.json`;

	try {
		const result = await Filesystem.readFile({
			path: path,
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		const chatHistory = JSON.parse(result.data);
		const keys = Object.keys(chatHistory);

		if (keys.length === 0) {
			console.log('No messages found!');
			return null;
		}

		// Get the latest message object
		const latestMessageKey = keys[keys.length - 1];
		return chatHistory[latestMessageKey];
	} catch (error) {
		console.error('Error fetching the latest message:', error);
		return null;
	}
}

// Fetch a specific message by messageID
export async function fetchMessageByID(friendName, messageID) {
	const path = `contacts/${friendName}/chat_history.json`;

	try {
		const result = await Filesystem.readFile({
			path: path,
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		const chatHistory = JSON.parse(result.data);

		// Search for the message with the given messageID
		for (const key in chatHistory) {
			if (chatHistory[key].messageID === messageID) {
				return chatHistory[key]; // Return the specific message object
			}
		}

		console.log('Message with the given messageID not found!');
		return null;
	} catch (error) {
		console.error('Error fetching message by ID:', error);
		return null;
	}
}

// Delete a message by messageID
export async function deleteMessage(friendName, messageID) {
	const path = `contacts/${friendName}/chat_history.json`;

	try {
		// Read the chat history
		const result = await Filesystem.readFile({
			path: path,
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		let chatHistory = JSON.parse(result.data);
		let messageFound = false;

		// Search for and delete the message with the given messageID
		for (const key in chatHistory) {
			if (chatHistory[key].messageID === messageID) {
				delete chatHistory[key]; // Delete the specific message object
				messageFound = true;
				break;
			}
		}

		if (!messageFound) {
			console.log('Message with the given messageID not found!');
			return;
		}

		// Write the updated chat history back to the file
		await Filesystem.writeFile({
			path: path,
			data: JSON.stringify(chatHistory, null, 2), // Pretty-print JSON
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		console.log('Message deleted successfully!');
	} catch (error) {
		console.error('Error deleting message:', error);
	}
}

// Fetch the latest message's messageID for a specific friend
export async function fetchLatestMessageID(friendName) {
	const path = `contacts/${friendName}/chat_history.json`;

	try {
		const result = await Filesystem.readFile({
			path: path,
			directory: Directory.Documents,
			encoding: Encoding.UTF8
		});

		const chatHistory = JSON.parse(result.data);
		const keys = Object.keys(chatHistory);

		if (keys.length === 0) {
			console.log('No messages found!');
			return null;
		}

		// Get the latest message object
		const latestMessageKey = keys[keys.length - 1];
		const latestMessage = chatHistory[latestMessageKey];

		// Return the messageID of the latest message
		return latestMessage.messageID;
	} catch (error) {
		console.error('Error fetching the latest message ID:', error);
		return null;
	}
}
