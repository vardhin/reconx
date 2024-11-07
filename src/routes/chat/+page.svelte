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
    import FaPaperPlane from 'svelte-icons/fa/FaPaperPlane.svelte';
    import FaChevronDown from 'svelte-icons/fa/FaChevronDown.svelte';
    import FaCheck from 'svelte-icons/fa/FaCheck.svelte';
    import FaTrash from 'svelte-icons/fa/FaTrash.svelte';
    import FaPencilAlt from 'svelte-icons/fa/FaPencilAlt.svelte';
	import { pushState } from '$app/navigation';
  
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
    let isDarkMode = false;
    let isLoaded = false;
    let pageLoaded = spring(0);
    let lastMessageTimestamp = 0;
  
    // Chunk Loading States
    const messageLimit = 20; // Number of messages per chunk
    let isLoadingOlderMessages = false;
    let hasMoreMessages = true;
  
    let messageContainer: HTMLDivElement;
    let scrollToBottom: () => void;
    let isSending = false;
    let isAtBottom = true;
    let showScrollButton = false;
  
    let selectedMessageId: string | null = null;
  
    const unsubscribeDarkMode = darkMode.subscribe((value) => {
        isDarkMode = value;
    });
  
    // Extract myName and friendName from the URL query params
    $: publicKeyA = $page.url.searchParams.get('myName') || '';
    $: publicKeyB = $page.url.searchParams.get('friendName') || '';
    
    // Create a sorted copy of messages to avoid mutating the original array
    $: sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
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

            // Subscribe to new events
            chatManager.onMessageDeleted(handleMessageDeleted);
            chatManager.onMessageUpdated(handleMessageUpdated);
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
  
        // Ensure listeners are only attached once
        chatManager.onMessageSaved(handleNewMessage);
        chatManager.onMessagesUpdated(fetchAndUpdateMessages);
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
                history.sort((a, b) => b.timestamp - a.timestamp); // Sort descending
                const paginated = history.slice(0, limit);
                messages = paginated.reverse(); // Reverse to ascending
                if (history.length < limit) {
                    hasMoreMessages = false;
                }
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
            if (messageContainer) {
              const newHeight = messageContainer.scrollHeight;
              messageContainer.scrollTop = newHeight - previousHeight;
            }
          });
        }).catch(error => {
          console.error('Error loading older messages:', error);
          errorMessage = 'Failed to load older messages.';
          isLoadingOlderMessages = false;
        });
      }

      if (messageContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messageContainer;
        isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        showScrollButton = !isAtBottom;
      }
    }
  
    async function sendMessage(event: Event) {
        event.preventDefault();
        
        if (newMessage.trim() && !isSending) {
            isSending = true;
            const message: ChatMessage = {
                text: newMessage.trim(),
                objectID: generateUniqueId(),
                type: 'message',
                senderID: publicKeyA,
                timestamp: Date.now(),
                acknowledgement: false,
            };
            
            try {
                messages = [...messages, message];
                newMessage = '';
                await tick();
                scrollToBottom();
                
                // Send message in the background
                await chatManager.sendMessage(message);
            } catch (error) {
                console.error('Error:', error);
                errorMessage = 'Failed to send message: ' + error.message;

                // Remove the optimistically added message
                messages = messages.filter(msg => msg.objectID !== message.objectID);
            } finally {
                isSending = false;
            }
        }
    }
  
    async function sendMessageToChatManager(message: ChatMessage) {
        if (chatManager) {
            try {
                await Promise.race([
                    chatManager.sendMessage(message),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 5000))
                ]);
            } catch (error) {
                console.error('Error sending to ChatManager:', error);
                errorMessage = 'Failed to send message: ' + error.message;
                messages = messages.map(msg => 
                    msg.objectID === message.objectID 
                        ? {...msg, sendStatus: 'failed'} 
                        : msg
                );
            }
        } else {
            console.error('ChatManager not available');
            errorMessage = 'ChatManager not available';
        }
    }
  
    async function editMessage() {
        if (chatManager && editMessageText.trim() && editMessageId) {
            try {
                await chatManager.editMessage(editMessageText, editMessageId);
                console.log('Edit action sent successfully');
                editMessageText = '';
                editMessageId = '';
            } catch (error) {
                console.error('Error editing message:', error);
                errorMessage = 'Failed to edit message: ' + error.message;
            }
        }
    }
  
    async function deleteMessage(targetObjectID: string) {
        if (chatManager && targetObjectID.trim()) {
            try {
                await chatManager.deleteMessage(targetObjectID);
                console.log('Delete action sent successfully');
            } catch (error) {
                console.error('Error deleting message:', error);
                errorMessage = 'Failed to delete message: ' + error.message;
            }
        }
    }

    async function acknowledgeMessage(targetObjectID: string) {
        if (chatManager && targetObjectID.trim()) {
            try {
                await chatManager.acknowledgeMessage(targetObjectID);
                console.log('Acknowledge action sent successfully');
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
            chatManager.offMessageDeleted(handleMessageDeleted);
            chatManager.offMessageUpdated(handleMessageUpdated);
        }
        unsubscribeDarkMode();
    });
  
    function handleNewMessage(newMessage: ChatMessage) {
        if (newMessage.timestamp > lastMessageTimestamp) {
            // Check if the message already exists in the array
            const existingMessageIndex = messages.findIndex(msg => msg.objectID === newMessage.objectID);
            if (existingMessageIndex !== -1) {
                // Update the existing message
                messages[existingMessageIndex] = { ...messages[existingMessageIndex], ...newMessage };
                messages = [...messages]; // Trigger reactivity
            } else {
                // Add the new message
                messages = [...messages, newMessage];
            }
            lastMessageTimestamp = newMessage.timestamp;
            tick().then(scrollToBottom);
        }
    }

    function handleMessageDeleted(objectID: string) {
        messages = messages.filter(msg => msg.objectID !== objectID);
    }

    function handleMessageUpdated(updatedMessage: ChatMessage) {
        messages = messages.map(msg => 
            msg.objectID === updatedMessage.objectID ? { ...msg, ...updatedMessage } : msg
        );
    }

    function smoothScrollToBottom() {
        if (messageContainer) {
            const scrollHeight = messageContainer.scrollHeight;
            const height = messageContainer.clientHeight;
            const maxScrollTop = scrollHeight - height;
            
            messageContainer.scrollTo({
                top: maxScrollTop,
                behavior: 'smooth'
            });
        }
    }

    function toggleMessageActions(messageId: string) {
        selectedMessageId = selectedMessageId === messageId ? null : messageId;
    }
    // Function to get sender name (you might want to replace this with actual logic)
    function getSenderName(senderId: string) {
        return senderId === publicKeyA ? publicKeyA : publicKeyB;
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
          {#each messages as message (message.objectID + '-' + message.timestamp)}
            <li class={message.senderID === publicKeyA ? 'sent' : 'received'}
                in:slide={{ axis: 'y', duration: 300 }}
                out:fade={{ duration: 200 }}
                animate:flip={{ duration: 300, easing: quintOut }}
                on:click={() => toggleMessageActions(message.objectID)}
            >
              <div class="message-content glass" in:scale={{ duration: 200, delay: 100 }}>
                <p>{message.text}</p>
                {#if selectedMessageId === message.objectID}
                    <div class="message-details" in:fade={{ duration: 200 }}>
                        <small>{getSenderName(message.senderID)}</small>
                        <small>{new Date(message.timestamp).toLocaleString()}</small>
                    </div>
                {/if}
              </div>
              {#if selectedMessageId === message.objectID}
                  <div class="message-actions" in:fade={{ duration: 200 }}>
                      {#if message.acknowledgement}
                          <span class="ack" in:scale={{ duration: 200 }}>
                              <div class="icon">
                                  <FaCheck />
                              </div>
                          </span>
                      {/if}
                      <button on:click|stopPropagation={() => acknowledgeMessage(message.objectID)} title="Acknowledge">
                          <div class="icon">
                              <FaCheck />
                          </div>
                      </button>
                      <button on:click|stopPropagation={() => deleteMessage(message.objectID)} title="Delete">
                          <div class="icon">
                              <FaTrash />
                          </div>
                      </button>
                      <button on:click|stopPropagation={() => startEditing(message.objectID, message.text)} title="Edit">
                          <div class="icon">
                              <FaPencilAlt />
                          </div>
                      </button>
                  </div>
              {/if}
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

    {#if showScrollButton}
      <button 
        class="scroll-to-bottom-btn"
        on:click={smoothScrollToBottom}
        in:fade={{ duration: 200 }}
        out:fade={{ duration: 200 }}
      >
        <div class="icon">
          <FaChevronDown />
        </div>
      </button>
    {/if}
  {:else}
    <div class="loading" in:scale={{ duration: 300 }}>Initializing chat...</div>
  {/if}
  
  <footer class="input-area glass">
    {#if editMessageId}
      <form on:submit|preventDefault={editMessage}>
        <input bind:value={editMessageText} placeholder="Edit message" />
        <button type="submit" title="Submit Edit" class="action-button">
          <i class="fas fa-check"></i>
        </button>
        <button type="button" on:click={cancelEdit} title="Cancel Edit" class="cancel-button">
          <i class="fas fa-times"></i>
        </button>
      </form>
    {:else}
      <form on:submit|preventDefault={sendMessage}>
        <input 
            bind:value={newMessage} 
            placeholder="Type your message"
            disabled={isSending}
        />
        <button type="submit" disabled={!newMessage.trim() || isSending} class="send-button glassmorphic">
            <div class="icon">
                <FaPaperPlane />
            </div>
        </button>
      </form>
    {/if}
  </footer>
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

  /* Apply dark mode styles */
  .dark-mode {
    /* Add your dark mode specific styles here */
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
    transition: all 0.3s ease;
    padding-top: 20px;  /* Add padding to the top */
    padding-bottom: 20px;  /* Add padding to the bottom */
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

  .message-container li:first-child {
    margin-top: 20px;  /* Add margin to the first message */
  }

  .message-container li:last-child {
    margin-bottom: 20px;  /* Add margin to the last message */
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

  /* Updated Input Area Styles */
  footer.input-area {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    display: flex;
    flex-direction: row;
    gap: 12px;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    z-index: 10;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    box-sizing: border-box;
  }

  footer.input-area form {
    display: flex;
    width: 100%;
    gap: 12px;
    align-items: center;
  }

  footer.input-area input {
    flex-grow: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 25px;
    background: rgba(255, 255, 255, 0.3);
    color: #333;
    font-size: 16px;
    transition: all 0.3s ease;
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  footer.input-area input:focus {
    background: rgba(255, 255, 255, 0.4);
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.2);
    outline: none;
  }

  footer.input-area button {
    padding: 12px;
    border: none;
    border-radius: 50%;
    background: rgba(18, 140, 126, 0.8);
    color: white;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  footer.input-area button:hover {
    background: rgba(7, 94, 84, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  footer.input-area button:disabled {
    background: rgba(150, 150, 150, 0.5);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  footer.input-area .cancel-button {
    background: rgba(231, 76, 60, 0.8);
  }

  footer.input-area .cancel-button:hover {
    background: rgba(192, 57, 43, 0.9);
  }

  footer.input-area .send-button {
    background: linear-gradient(135deg, #25D366, #128C7E);
  }

  footer.input-area .send-button:hover {
    background: linear-gradient(135deg, #128C7E, #075E54);
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
    position: absolute;
    right: 0;
    bottom: -30px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 15px;
    padding: 5px;
    z-index: 10; /* Ensure it appears above other elements */
  }

  .message-actions button {
    background: rgba(255, 255, 255, 0.25);
    border: none;
    cursor: pointer;
    margin-left: 5px;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    color: #ffffff;
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .message-actions button:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(1.1);
  }

  .message-actions .icon {
    width: 16px;
    height: 16px;
  }

  .ack {
    color: #34b7f1;
    margin-right: 5px;
    text-shadow: 0px 0px 3px rgba(0,0,0,0.3);
  }

  /* Input Area */
  .input-area {
    padding: 15px;
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
      padding: 10px 12px;
      border-radius: 0;
      left: 0;
      right: 0;
      width: 100%;
    }

    footer.input-area input {
      padding: 10px 16px;
      font-size: 14px;
    }

    footer.input-area button {
      padding: 10px;
      font-size: 16px;
      width: 40px;
      height: 40px;
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

  /* Additional Styles for Loading Older Messages and No More Messages */
  .no-more {
    text-align: center;
    color: #a0a0a0;
    padding: 10px;
    font-style: italic;
  }

  .icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Ensure the icon color matches the button text color */
  :global(.icon svg) {
    fill: currentColor;
  }

  .scroll-to-bottom-btn {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(18, 140, 126, 0.8);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }

  .scroll-to-bottom-btn:hover {
    background: rgba(7, 94, 84, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .scroll-to-bottom-btn .icon {
    width: 20px;
    height: 20px;
  }

  /* Add styles for message details */
  .message-details {
    display: flex;
    flex-direction: column;
    font-size: 0.75em;
    color: #e0e0e0;
    margin-top: 5px;
  }

  .message-details small {
    margin-top: 2px;
  }

  /* Add this new style for positioning */
  li {
    position: relative;
  }

  /* Updated styles for the send button */
  .send-button.glassmorphic {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
  }

  .send-button.glassmorphic:hover {
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 7px 14px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .send-button.glassmorphic:active {
    transform: translateY(1px);
  }

  .send-button.glassmorphic .icon {
    width: 24px;
    height: 24px;
    transition: all 0.3s ease;
  }

  /* Glow effect for the send button */
  .send-button.glassmorphic::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ff00ea, #00fffb);
    filter: blur(15px);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
    border-radius: inherit;
  }

  .send-button.glassmorphic:hover::after {
    opacity: 0.7;
  }

  /* Theme-based color for the send button icon */
  :global(.send-button.glassmorphic .icon svg) {
    fill: var(--text-color);
    filter: drop-shadow(0 0 2px var(--text-color));
  }

  /* Dark mode specific styles */
  .dark-mode .send-button.glassmorphic {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.05);
  }

  .dark-mode .send-button.glassmorphic:hover {
    background: rgba(0, 0, 0, 0.25);
  }

  .dark-mode .send-button.glassmorphic::after {
    background: linear-gradient(45deg, #7700ff, #00ffd5);
  }
</style>












