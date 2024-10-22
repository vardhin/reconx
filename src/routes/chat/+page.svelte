<script lang="ts">
    import { onMount, tick } from 'svelte';
    import ChatManager from '../../lib/ChatManager';
    import type { ChatMessage } from '../../lib/ChatManager'; // Use type-only import
    import { page } from '$app/stores';
    import Navbar from '../NavBar.svelte';
  
    let roomID = 'Unknown Room';
    let publicKeyA = '';
    let publicKeyB = '';
    let chatManager= ChatManager ;
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
  
    async function initializeChat() {
      try {
        chatManager = new ChatManager(publicKeyA, publicKeyB, publicKeyA) as any;
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
        console.log('Sending message:', message);
        await chatManager.gun.get(chatManager.roomId).set(message);
        newMessage = '';
        await fetchMessages();
      }
    }
  
    async function editMessage() {
      if (chatManager && editMessageText.trim() && editMessageId) {
        const message: ChatMessage = {
          text: `${editMessageText}$${editMessageId}`,
          objectID: editMessageId,
          type: 'edit',
          senderID: publicKeyA,
          timestamp: Date.now(),
          acknowledgement: false,
        };
        console.log('Editing message:', message);
        await chatManager.gun.get(chatManager.roomId).set(message);
        await chatManager.editMessageById(`${editMessageText}$${editMessageId}`);
        editMessageText = '';
        editMessageId = '';
        await fetchMessages();
      }
    }
  
    async function deleteMessage(objectID: string) {
      if (chatManager) {
        const message: ChatMessage = {
          text: '',
          objectID: objectID,
          type: 'delete',
          senderID: publicKeyA,
          timestamp: Date.now(),
          acknowledgement: false,
        };
        console.log('Deleting message:', message);
        await chatManager.gun.get(chatManager.roomId).set(message);
        await chatManager.deleteMessageById(objectID);
        await fetchMessages();
      }
    }
  
    async function acknowledgeMessage(objectID: string) {
      if (chatManager) {
        const message: ChatMessage = {
          text: '',
          objectID: objectID,
          type: 'acknowledgment',
          senderID: publicKeyA,
          timestamp: Date.now(),
          acknowledgement: false,
        };
        console.log('Acknowledging message:', message);
        await chatManager.gun.get(chatManager.roomId).set(message);
        await chatManager.acknowledgeMessageById(objectID);
        await fetchMessages();
      }
    }
  
    function generateUniqueId(): string {
      return Math.random().toString(36).substr(2, 9);
    }
  </script>
  
  <main>
    <Navbar title={publicKeyB}/>
  
    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}
  
    <div class="message-history">
      <h2>Messages</h2>
      {#if loading}
        <div>Loading messages...</div>
      {:else}
        <ul>
          {#each messages as message}
            <li>
              <strong>{message.senderID}:</strong> {message.text}
              <small>{new Date(message.timestamp).toLocaleString()}</small>
              {#if message.acknowledgement}
                <span class="ack">(Acknowledged)</span>
              {/if}
              <button on:click={() => acknowledgeMessage(message.objectID)}>Acknowledge</button>
              <button on:click={() => deleteMessage(message.objectID)}>Delete</button>
              <button on:click={() => { editMessageId = message.objectID; editMessageText = message.text; }}>Edit</button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  
    <div>
      <h2>Send Message</h2>
      <input bind:value={newMessage} placeholder="Type your message" />
      <button on:click={sendMessage}>Send</button>
    </div>
  
    <div>
      <h2>Edit Message</h2>
      <input bind:value={editMessageText} placeholder="New message text" />
      <button on:click={editMessage}>Edit</button>
    </div>
  </main>
  
  <style>
    main {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
      flex-direction: column;
    }
  
    input {
      margin: 10px 0;
      padding: 10px;
      width: 100%;
      box-sizing: border-box;
    }
  
    button {
      margin: 10px 0;
      padding: 10px 20px;
      cursor: pointer;
    }
  
    ul {
      list-style: none;
      padding: 0;
    }
  
    li {
      margin: 10px 0;
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
  
    .ack {
      color: green;
      font-style: italic;
    }
  
    .error {
      color: red;
    }
  
    .message-history {
      margin-bottom: 20px;
    }
  </style>
  
