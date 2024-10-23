<script lang="ts">
    import { onMount, afterUpdate, tick, onDestroy } from 'svelte';
    import ChatManager from '../../lib/ChatManager';
    import type { ChatMessage } from '../../lib/ChatManager';
    import { page } from '$app/stores';
    import Navbar from '../NavBar.svelte';
    import { v4 as uuidv4 } from 'uuid';
    import { darkMode } from '../../lib/stores';
    import { fade, fly, scale, slide } from 'svelte/transition';
    import { spring } from 'svelte/motion';
    import { flip } from 'svelte/animate';
    import { quintOut } from 'svelte/easing';
  
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
    let isDarkMode;
    let isLoaded = false;
    let pageLoaded = spring(0);
    let lastMessageTimestamp = 0;
  
    // Chunk Loading States
    let messageLimit = 20; // Number of messages per chunk
    let isLoadingOlderMessages = false;
    let hasMoreMessages = true;
  
    let messageContainer: HTMLDivElement;
    let scrollToBottom: () => void;
  
    darkMode.subscribe((value) => {
		isDarkMode = value;
	});
    // Extract myName and friendName from the URL query params
    $: publicKeyA = $page.url.searchParams.get('myName') || '';
    $: publicKeyB = $page.url.searchParams.get('friendName') || '';
    
    $: sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    
    async function fetchAndUpdateMessages() {
        await fetchMessages();
        await tick();
        scrollToBottom();
    }
    onMount(async () => {
        if (publicKeyA && publicKeyB) {
            await initializeChat();
            isLoaded = true;

            // Define scrollToBottom after chat is initialized
            scrollToBottom = () => {
                if (messageContainer) {
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }
            };

            scrollToBottom();

            // Subscribe to both messageSaved and messagesUpdated events
            chatManager.onMessageSaved(handleNewMessage);
            chatManager.onMessagesUpdated(fetchAndUpdateMessages);
        } else {
            errorMessage = 'Both public keys are required to start the chat.';
            isLoaded = true;
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
  
        chatManager.onMessageSaved(async (newMessage) => {
            if (newMessage.timestamp > lastMessageTimestamp) {
                messages = [...messages, newMessage];
                lastMessageTimestamp = newMessage.timestamp;
                await tick();
                scrollToBottom();
            }
        });
      } catch (error) {
        console.error('Error initializing chat:', error);
        errorMessage = 'Failed to initialize chat.';
      }
    }
  
    async function fetchMessages(limit: number = messageLimit, beforeTimestamp: number = Date.now()) {
        if (chatManager) {
            loading = true;
            try {
                const history = await chatManager.readChatHistory();
                if (history.length < limit) {
                    hasMoreMessages = false;
                }
                messages = history; // This will trigger reactivity
                if (messages.length > 0) {
                    lastMessageTimestamp = messages[messages.length - 1].timestamp;
                }
                console.log('Fetched messages:', messages);
            } catch (error) {
                console.error('Error fetching messages:', error);
                errorMessage = 'Failed to fetch messages.';
            } finally {
                loading = false;
                isLoadingOlderMessages = false;
            }
        }
    }
  
    async function loadOlderMessages() {
      if (isLoadingOlderMessages || !hasMoreMessages) return;
      isLoadingOlderMessages = true;
      const oldestMessage = messages[0];
      const beforeTimestamp = oldestMessage ? oldestMessage.timestamp : Date.now();
      await fetchMessages(messageLimit, beforeTimestamp);
    }
  
    function handleScroll() {
      if (messageContainer.scrollTop === 0 && hasMoreMessages && !isLoadingOlderMessages) {
        const previousHeight = messageContainer.scrollHeight;
        loadOlderMessages().then(() => {
          // Maintain scroll position after loading older messages
          afterUpdate(() => {
            const newHeight = messageContainer.scrollHeight;
            messageContainer.scrollTop = newHeight - previousHeight;
          });
        });
      }
    }
  
    async function sendMessage(event: Event) {
        event.preventDefault();
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
                await chatManager.sendMessage(message);
                console.log('Message sent successfully');
                newMessage = '';
                messages = [...messages, message]; // This will trigger reactivity
                await tick();
                scrollToBottom();
            } catch (error) {
                console.error('Error sending message:', error);
                errorMessage = 'Failed to send message.';
            }
        }
    }
  
    async function editMessage() {
        if (chatManager && editMessageText.trim() && editMessageId) {
            try {
                await chatManager.editMessage(editMessageText, editMessageId);
                console.log('Edit action sent successfully');
                messages = messages.map(msg => 
                    msg.objectID === editMessageId 
                        ? {...msg, text: editMessageText} 
                        : msg
                ); // This will trigger reactivity
                editMessageText = '';
                editMessageId = '';
            } catch (error) {
                console.error('Error editing message:', error);
                errorMessage = 'Failed to edit message.';
            }
        }
    }
  
    async function deleteMessage(targetObjectID: string) {
        if (chatManager && targetObjectID.trim()) {
            try {
                await chatManager.deleteMessage(targetObjectID);
                console.log('Delete action sent successfully');
                messages = messages.filter(msg => msg.objectID !== targetObjectID); // This will trigger reactivity
            } catch (error) {
                console.error('Error deleting message:', error);
                errorMessage = 'Failed to delete message.';
            }
        }
    }
  
    async function acknowledgeMessage(targetObjectID: string) {
        if (chatManager && targetObjectID.trim()) {
            try {
                await chatManager.acknowledgeMessage(targetObjectID);
                console.log('Acknowledge action sent successfully');
                messages = messages.map(msg => 
                    msg.objectID === targetObjectID 
                        ? {...msg, acknowledgement: true} 
                        : msg
                ); // This will trigger reactivity
            } catch (error) {
                console.error('Error acknowledging message:', error);
                errorMessage = 'Failed to acknowledge message.';
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
    onDestroy(() => {
        if (chatManager) {
            chatManager.offMessageSaved(handleNewMessage);
            chatManager.offMessagesUpdated(fetchAndUpdateMessages);
        }
    });

    function handleNewMessage(newMessage: ChatMessage) {
        if (newMessage.timestamp > lastMessageTimestamp) {
            messages = [...messages, newMessage]; // This will trigger reactivity
            lastMessageTimestamp = newMessage.timestamp;
            tick().then(scrollToBottom);
        }
    }
</script>

<main class="contact-screen" class:dark-mode={isDarkMode}>
  <Navbar title={publicKeyB}/>

  {#if isLoaded}
    <div
      class="message-container"
      bind:this={messageContainer}
      on:scroll={handleScroll}
      in:fade={{ duration: 400, delay: 200 }}
    >
      {#if loading && messages.length === 0}
        <div class="loading" in:scale={{ duration: 300, delay: 100 }}>Loading messages...</div>
      {:else if errorMessage}
        <div class="error" in:fly={{ y: 20, duration: 300, delay: 100 }}>
          {errorMessage}
        </div>
      {:else}
        <ul>
          {#each sortedMessages as message (message.objectID)}
            <li class={message.senderID === publicKeyA ? 'sent' : 'received'}
                in:slide={{ axis: 'y', duration: 300 }}
                out:fade={{ duration: 200 }}
                animate:flip={{ duration: 300, easing: quintOut }}
            >
              <div class="message-content glass" in:scale={{ duration: 200, delay: 100 }}>
                <p>{message.text}</p>
                <small>{new Date(message.timestamp).toLocaleString()}</small>
              </div>
              <div class="message-actions" in:fade={{ duration: 200, delay: 200 }}>
                {#if message.acknowledgement}
                  <span class="ack" in:scale={{ duration: 200 }}>✓</span>
                {/if}
                <button on:click={() => acknowledgeMessage(message.objectID)} title="Acknowledge">✓</button>
                <button on:click={() => deleteMessage(message.objectID)} title="Delete">🗑️</button>
                <button on:click={() => startEditing(message.objectID, message.text)} title="Edit">✏️</button>
              </div>
            </li>
          {/each}
        </ul>
        {#if isLoadingOlderMessages}
          <div class="loading" in:scale={{ duration: 200 }}>Loading older messages...</div>
        {/if}
        {#if !hasMoreMessages && messages.length > 0}
          <div class="no-more" in:fade={{ duration: 200 }}>No more messages</div>
        {/if}
      {/if}
    </div>

    <footer class="input-area glass" in:fly={{ y: 50, duration: 300, delay: 300 }}>
      {#if editMessageId}
        <form on:submit|preventDefault={editMessage}>
          <input bind:value={editMessageText} placeholder="Edit message" in:scale={{ duration: 200 }}/>
          <button type="submit" title="Submit Edit" in:scale={{ duration: 200, delay: 50 }}>Submit Edit</button>
          <button type="button" on:click={cancelEdit} title="Cancel Edit" class="cancel-button" in:scale={{ duration: 200, delay: 100 }}>Cancel</button>
        </form>
      {:else}
        <form on:submit|preventDefault={sendMessage}>
          <input bind:value={newMessage} placeholder="Type your message" in:scale={{ duration: 200 }}/>
          <button type="submit" title="Send Message" in:scale={{ duration: 200, delay: 50 }}>Send</button>
        </form>
      {/if}
    </footer>
  {:else}
    <div class="loading" in:scale={{ duration: 300 }}>Initializing chat...</div>
  {/if}
</main>

<style>
  /* General Styles */
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg);
    background-size: cover;
    overflow: hidden;
    position: relative;
  }

  /* Message Container */
  .message-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 60px 10px 70px; /* Adjust top and bottom padding */
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    scrollbar-width: thin; /* For Firefox */
  }

  /* Custom Scrollbar for Webkit */
  .message-container::-webkit-scrollbar {
    width: 8px;
  }

  .message-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .message-container ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-container li {
    display: flex;
    flex-direction: column;
    max-width: 80%;
  }

  .message-container li.sent {
    align-self: flex-end;
  }

  .message-container li.received {
    align-self: flex-start;
  }

  /* Navbar styles */
  :global(.navbar) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  /* Input Area */
  footer.input-area {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 15px;
    border-radius: 15px 15px 0 0;
    display: flex;
    flex-direction: row;
    gap: 10px;
    max-width: 800px;
    margin: 0 auto;
    z-index: 10;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
  }

  /* Message Content */
  .message-content {
    max-width: 80%; 
    padding: 12px 15px;
    border-radius: 18px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    word-wrap: break-word;
    background: rgba(255, 255, 255, 0.3);
    transition: background 0.3s;
    position: relative;
  }

  .sent .message-content {
    background: rgba(220, 248, 198, 0.3);
    border: 1px solid rgba(220, 248, 198, 0.5);
  }

  .received .message-content {
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

  /* Glassmorphism Utility */
  .glass {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
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
    padding: 15px;
    border-radius: 15px;
    margin-bottom: 10px;
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  input {
    flex-grow: 1;
    padding: 12px 15px;
    border: none;
    border-radius: 20px;
    margin-right: 10px;
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    backdrop-filter: blur(5px);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    outline: none;
    transition: background 0.3s, transform 0.3s;
  }

  input::placeholder {
    color: #e0e0e0;
  }

  input:focus {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(1.02);
  }

  button {
    padding: 12px 20px;
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
    transform: translateY(-2px) scale(1.05);
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
      padding: 0;
    }

    .message-content {
      max-width: 90%;
    }

    .input-area {
      padding: 10px;
    }

    input, button {
      padding: 10px 15px;
    }

    .message-container {
      padding: 60px 5px 70px; /* Adjust padding for mobile */
    }

    .message-container ul {
      gap: 8px;
    }

    footer.input-area {
      padding: 10px;
    }
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Update these styles for smoother animations */
  .message-container {
    transition: all 0.3s ease;
  }

  .message-content, .message-actions button, input, button {
    transition: all 0.2s ease;
  }

  .message-actions button:hover {
    transform: scale(1.1);
  }

  input:focus {
    transform: scale(1.02);
  }

  button:hover {
    transform: translateY(-2px) scale(1.05);
  }

  /* Add this new style for smoother list updates */
  .message-container ul {
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.3s ease;
  }

  /* Additional Styles for Loading Older Messages and No More Messages */
  .no-more {
    text-align: center;
    color: #a0a0a0;
    padding: 10px;
    font-style: italic;
  }
</style>



