import Gun from 'gun';
import {
	addMessageToContactHistory
	//updateMessageAcknowledgment,
	//deleteMessageFromHistory,
	//updateContactStatus
} from './contactManager';

// Connect to Gun peers
const gun = Gun({
	peers: ['https://gun-manhattan.herokuapp.com/gun']
});

// Function to send a message to the Gun database and save to the file system
export const sendMessageToDB = async (id, friendID, message, type = 'message') => {
	if (!message.trim()) return; // Avoid sending empty messages

	const newMessage = {
		message: message.trim(),
		msgID: `${Date.now()}_${id}`, // Unique msgID (timestamp + id)
		writerID: id, // Sender's ID
		type, // Type of the message (message, acknowledgment, online, etc.)
		acknowledgment: false, // Initially not acknowledged
		timestamp: Date.now() // Current timestamp
	};

	try {
		// Save message to Gun
		gun.get(friendID).set(newMessage);

		// Append the new message to the local chat history
		await addMessageToContactHistory(friendID, newMessage);
	} catch (error) {
		console.error('Error sending message to DB:', error);
	}
};

// Function to listen for updates in the Gun database
export const listenToUpdates = (id, friendName, setRoomData) => {
	const roomListener = gun.get(id);

	roomListener.map((data) => {
		if (!data || !data.message) return;

		// Destructure received data
		const { message, msgID, writerID, type, acknowledgment, timestamp } = data;

		if (type === 'message') {
			// Add new message to the chat history
			setRoomData((prevData) => {
				if (prevData.some((item) => item.msgID === msgID)) return prevData; // Avoid duplicates

				const formattedMessage = { message, msgID, writerID, type, acknowledgment, timestamp };
				return [...prevData, formattedMessage];
			});
			addMessageToContactHistory(friendName, {
				message,
				msgID,
				writerID,
				type,
				acknowledgment,
				timestamp
			});
		} else if (type === 'acknowledgment') {
			// Update message acknowledgment
			//updateMessageAcknowledgment(friendName, msgID, acknowledgment);
		} else if (type === 'online') {
			// Update contact's online status
			//const isOnline = acknowledgment;
			//updateContactStatus(friendName, isOnline, timestamp);
		} else if (type === 'delete') {
			// Delete the message from chat history
			//deleteMessageFromHistory(friendName, msgID);
		}
		// Add other types (e.g., magnetlink) as needed
	});

	// Return a cleanup function to remove the listener
	return () => {
		roomListener.off(); // Clean up the listener
	};
};
