<script>
  import { saveMessage, fetchChatHistory, deleteMessage } from '../lib/utils/chatManager';
  import { getContactDetails } from '../lib/utils/contactManager';
  import { page } from '$app/stores';
  import Navbar from './NavBar.svelte';
  import { darkMode } from '../lib/utils/stores';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
  import { fade } from 'svelte/transition'; // Import Svelte's fade transition

  let isDarkMode;
  let contactName = 'Unknown Contact';
  let history = [];
  let isLoading = true;
  let contactDetails = null;
  let newMessage = '';
  let acknowledgment = false;
  let clickedMessageID = null;
  let chatEndRef;

  $: {
      const { state } = $page;
      contactName = state?.contactName || 'Unknown Contact';
      if (contactName !== 'Unknown Contact') {
          fetchData();
      }
  }

  const fetchData = async () => {
      if (!contactName || contactName === 'Unknown Contact') return;
      try {
          isLoading = true;
          history = await fetchChatHistory(contactName);
          contactDetails = await getContactDetails(contactName);
      } catch (error) {
          console.error('Error fetching data:', error);
      } finally {
          isLoading = false;
      }
  };

  const generateMessageID = () => Date.now() + Math.floor(Math.random() * 1000);

  const scrollToBottom = () => {
      if (chatEndRef) {
          chatEndRef.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const saveNewMessage = async () => {
      if (!newMessage) return;

      try {
          const timestamp = new Date().toISOString();
          const newMessageID = generateMessageID();

          await saveMessage(
              newMessage,
              newMessageID,
              'text',
              contactDetails.id,
              acknowledgment,
              contactName,
              timestamp
          );
          await fetchData();
          newMessage = '';
          scrollToBottom();
      } catch (error) {
          console.error('Error saving message:', error);
      }
  };
  
  const deleteMessageByID = async (messageID) => {
      try {
          await deleteMessage(contactName, messageID);
          await fetchData();
      } catch (error) {
          console.error('Error deleting message:', error);
      }
  };
  
  const handleClickMessage = (messageID) => {
      clickedMessageID = clickedMessageID === messageID ? null : messageID;
  };
  
  darkMode.subscribe((value) => {
      isDarkMode = value;
  });
  
  const autoResize = (event) => {
      const textarea = event.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
  };

  function handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveNewMessage();
      }
  }
</script>

<Navbar title={contactName} />
<body>
<div class="chat-screen" class:dark-mode={isDarkMode} in:fade={{ duration: 300 }}>
  <div class="chat-content" in:fade={{ duration: 300 }}>
      {#if isLoading}
          <p class="loading-text">Loading chat history...</p>
      {:else if Object.keys(history).length > 0}
          <div class="chat-list">
              {#each Object.values(history) as message (message.messageID)}
                  <div 
                      class="chat-message {message.yourID === contactDetails.id ? 'chat-message--user' : 'chat-message--contact'}"
                      on:click={() => handleClickMessage(message.messageID)}
                      in:fade={{ duration: 800 }}
                  >
                      <p>{message.message}</p>

                      {#if clickedMessageID === message.messageID}
                          <div class="chat-message__header" in:fade={{ duration: 300 }}>
                              <strong>{message.yourID === contactDetails.id ? contactName : 'You'}:</strong>
                              <em>{new Date(message.timestamp).toLocaleTimeString()}</em>
                          </div>
                          <button 
                              class="chat-message__delete-btn" 
                              on:click|stopPropagation={() => deleteMessageByID(message.messageID)}
                              aria-label="Delete message"
                              in:fade={{ duration: 300 }}
                          >
                              &times;
                          </button>
                      {/if}
                  </div>
              {/each}
              <div bind:this={chatEndRef}></div>
          </div>
      {:else}
          <p class="no-chat">No chat history available.</p>
      {/if}
  </div>
</div>
</body>

<div class="message-form" in:fade={{ duration: 500 }}>
  <textarea 
      class="message-form__input" 
      bind:value={newMessage} 
      placeholder="Say something nice :]" 
      on:input={autoResize}
      rows="1" 
      on:keydown={handleKeydown}
  />
  <button class="message-form__send-btn" on:click={saveNewMessage} aria-label="Send message">
      <FontAwesomeIcon icon={faPaperPlane} class="icon" />
  </button>
</div>

<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />

<style>
  body {
      font-family: 'Orbitron', sans-serif;
  }

  .chat-screen {
      transition: all 0.5s ease;
  }

  .message-form__input {
      font-family: 'Orbitron', sans-serif;
  }

  .chat-message {
      transition: all 0.8s ease;
  }

  .chat-message__delete-btn {
      transition: all 0.6s ease;
  }
</style>
