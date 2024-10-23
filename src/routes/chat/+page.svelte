<script lang="ts">
    import { onMount, tick } from 'svelte';
    import ChatManager from '../../lib/ChatManager';
    import type { ChatMessage } from '../../lib/ChatManager'; // Use type-only import
    import { page } from '$app/stores';
    import Navbar from '../NavBar.svelte';
    import { v4 as uuidv4 } from 'uuid';


  
    let roomID = 'Unknown Room';
    let publicKeyA = '';
    let publicKeyB = '';
    let chatManager: ChatManager;
    let messages: ChatMessage[] = [];
    let newMessage = '';
    let editMessageId = '';
    let editMessageText = '';
    let loading = false;
    let errorMessage = '';
  
    // Extract myName and friendName from the URL query params
    $: publicKeyA = $page.url.searchParams.get('myName') || '';
    $: publicKeyB = $page.url.searchParams.get('friendName') || '';
  
    onMount(() => {
      if (publicKeyA && publicKeyB) {
        initializeChat();
      } else {
        errorMessage = 'Both public keys are required to start the chat.';
      }
    });

    function generateUniqueId(): string {
        return uuidv4();
    }
  
    async function initializeChat() {
      try {
        chatManager = new ChatManager(publicKeyA, publicKeyB, publicKeyA);
        console.log('ChatManager initialized:', chatManager);
  
        await fetchMessages();
  
        chatManager.onMessagesUpdated = async () => {
          await fetchMessages();
        };
      } catch (error) {
        console.error('Error initializing chat:', error);
        errorMessage = 'Failed to initialize chat.';
      }
    }
  
    async function fetchMessages() {
      if (chatManager) {
        loading = true;
        try {
          const history = await chatManager.readChatHistory();
          messages = [...history.sort((a, b) => a.timestamp - b.timestamp)];
          console.log('Fetched messages:', messages);
          await tick(); // Ensure DOM updates after fetching messages
        } catch (error) {
          console.error('Error fetching messages:', error);
          errorMessage = 'Failed to fetch messages.';
        } finally {
          loading = false;
        }
      }
    }
  
    async function sendMessage() {
      if (chatManager && newMessage.trim()) {
        const message: ChatMessage = {
          text: newMessage,
          objectID: generateUniqueId(),
          type: 'message',
          senderID: publicKeyA,
          timestamp: Date.now(),
          acknowledgement: false,
        };
        console.log('Attempting to send message:', message);
        try {
          await chatManager.gun.get(chatManager.roomId).get(message.objectID).put(message);
          console.log('Message sent successfully');
          newMessage = '';
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  
    async function editMessage() {
        if (chatManager && editMessageText.trim() && editMessageId) {
            const message: ChatMessage = {
                text: editMessageText,
                objectID: generateUniqueId(), // Unique ID for the edit action
                type: 'edit',
                senderID: publicKeyA,
                timestamp: Date.now(),
                acknowledgement: false,
                targetID: editMessageId, // Reference to the message being edited
            };
            console.log('Editing message:', message);
            try {
                await chatManager.gun.get(chatManager.roomId).set(message);
                console.log('Edit action sent successfully');
                editMessageText = '';
                editMessageId = '';
            } catch (error) {
                console.error('Error sending edit action:', error);
                errorMessage = 'Failed to send edit action.';
            }
        }
    }
  
    async function deleteMessage(targetObjectID: string) {
      if (chatManager && targetObjectID.trim()) {
        const message: ChatMessage = {
          text: '', // Optional: You can include a reason or context if needed
          objectID: generateUniqueId(), // Ensure a unique ID for this action
          type: 'delete',
          senderID: publicKeyA,
          timestamp: Date.now(),
          acknowledgement: false,
          targetID: targetObjectID, // Specify which message to delete
        };
        console.log('Deleting message:', message);
        try {
          await chatManager.gun.get(chatManager.roomId).set(message);
          console.log('Delete action sent successfully');
        } catch (error) {
          console.error('Error sending delete action:', error);
        }
      }
    }
  
    async function acknowledgeMessage(targetObjectID: string) {
      if (chatManager && targetObjectID.trim()) {
        const message: ChatMessage = {
          text: '', // Optional: Additional info if needed
          objectID: generateUniqueId(), // Ensure a unique ID for this action
          type: 'acknowledgment',
          senderID: publicKeyA,
          timestamp: Date.now(),
          acknowledgement: false,
          targetID: targetObjectID, // Specify which message to acknowledge
        };
        console.log('Acknowledging message:', message);
        try {
          await chatManager.gun.get(chatManager.roomId).set(message);
          console.log('Acknowledge action sent successfully');
        } catch (error) {
          console.error('Error sending acknowledge action:', error);
        }
      }
    }

    function cancelEdit() {
      editMessageId = '';
      editMessageText = '';
    }

    function startEditing(messageId: string, currentText: string) {
        editMessageId = messageId;
        editMessageText = currentText;
    }

    async function updateChatUI() {
        // Implement your UI update logic here
    }
</script>

<main>
  <Navbar title={publicKeyB}/>

  {#if errorMessage}
    <div class="error glass">
      {errorMessage}
    </div>
  {/if}

  <div class="chat-container glass">
    <div class="message-history">
      {#if loading}
        <div class="loading">Loading messages...</div>
      {:else}
        <ul>
          {#each messages as message}
            {#if message.type === 'message'}
              <li class={message.senderID === publicKeyA ? 'sent' : 'received'}>
                <div class="message-content glass">
                  <p>{message.text}</p>
                  <small>{new Date(message.timestamp).toLocaleString()}</small>
                </div>
                <div class="message-actions">
                  {#if message.acknowledgement}
                    <span class="ack">✓</span>
                  {/if}
                  <button on:click={() => acknowledgeMessage(message.objectID)} title="Acknowledge">✓</button>
                  <button on:click={() => deleteMessage(message.objectID)} title="Delete">🗑️</button>
                  <button on:click={() => { editMessageId = message.objectID; editMessageText = message.text; }} title="Edit">✏️</button>
                </div>
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
    </div>
  </div>

</main>
<div class="input-area glass">
  {#if editMessageId}
    
      <input bind:value={editMessageText} placeholder="Edit message" />
      <button on:click={editMessage} title="Submit Edit">Submit Edit</button>
      <button on:click={cancelEdit} title="Cancel Edit" class="cancel-button">Cancel</button>
    
  {:else}
    
      <input bind:value={newMessage} placeholder="Type your message" />
      <button on:click={sendMessage} title="Send Message">Send</button>
    
  {/if}
</div>

<style>
  /* General Styles */
  main {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: url('/path-to-background-image.jpg') no-repeat center center fixed;
    background-size: cover;
    overflow: hidden;
    margin-top: 17%;
  }

  /* Glassmorphism Utility */
  .glass {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  }

  /* Chat Container */
  .chat-container {
    flex-grow: 1;
    overflow-y: auto;
    margin-bottom: 20px;
    padding: 20px;
    border-radius: 15px;
    box-sizing: border-box;
  }

  /* Message History */
  .message-history ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .message-history li {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* Message Content */
  .message-content {
    max-width: 70%;
    padding: 10px 15px;
    border-radius: 18px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    word-wrap: break-word;
  }

  .sent .message-content {
    align-self: flex-end;
    background: rgba(220, 248, 198, 0.3);
    border: 1px solid rgba(220, 248, 198, 0.5);
  }

  .received .message-content {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .message-content p {
    margin: 0 0 5px 0;
    color: #ffffff;
    text-shadow: 0px 0px 5px rgba(0,0,0,0.5);
  }

  .message-content small {
    font-size: 0.75em;
    color: #e0e0e0;
    text-shadow: 0px 0px 3px rgba(0,0,0,0.3);
  }

  /* Message Actions */
  .message-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 5px;
  }

  .message-actions button {
    background: rgba(255, 255, 255, 0.25);
    border: none;
    cursor: pointer;
    font-size: 1em;
    margin-left: 5px;
    padding: 5px;
    border-radius: 8px;
    transition: background 0.3s, transform 0.3s;
    color: #ffffff;
    backdrop-filter: blur(5px);
  }

  .message-actions button:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(1.1);
  }

  .ack {
    color: #34b7f1;
    margin-right: 5px;
    text-shadow: 0px 0px 3px rgba(0,0,0,0.3);
  }

  /* Input Area */
  .input-area {
    padding-left: 10%;
    padding-right: 10%;
    padding-top: 5%;
    padding-bottom: 5%;
    width: 100%;
    display: flex;
    border-radius: 0px;
    flex-direction: row;
    gap: 10px;
  }

  .edit-message, .new-message {
    display: flex;
    align-items: center;
  }

  .edit-message {
    background: rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 12px;
    animation: fadeIn 0.3s ease-in-out;
  }

  .new-message {
    background: rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 12px;
    animation: fadeIn 0.3s ease-in-out;
  }

  input {
    flex-grow: 1;
    padding: 10px 15px;
    border: none;
    border-radius: 20px;
    margin-right: 10px;
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    backdrop-filter: blur(5px);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    outline: none;
    transition: background 0.3s;
  }

  input::placeholder {
    color: #e0e0e0;
  }

  input:focus {
    background: rgba(255, 255, 255, 0.35);
  }

  button {
    padding: 10px 20px;
    background: rgba(18, 140, 126, 0.6);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.3s;
    backdrop-filter: blur(5px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  button:hover {
    background: rgba(7, 94, 84, 0.8);
    transform: translateY(-2px);
  }

  .cancel-button {
    background: rgba(231, 76, 60, 0.6);
  }

  .cancel-button:hover {
    background: rgba(192, 57, 43, 0.8);
  }

  /* Error Message */
  .error {
    color: #d32f2f;
    background: rgba(255, 205, 210, 0.3);
    padding: 10px;
    border-radius: 10px;
    margin-bottom: 15px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    backdrop-filter: blur(5px);
  }

  /* Loading Indicator */
  .loading {
    text-align: center;
    color: #e0e0e0;
    padding: 20px;
    font-style: italic;
  }

  /* Responsive Design */
  @media (max-width: 600px) {
    main {
      padding: 10px;
    }

    .chat-container {
      padding: 15px;
    }

    .message-content {
      max-width: 85%;
    }

    button {
      padding: 8px 16px;
    }
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>


