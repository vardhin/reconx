<script>
    import { createContact } from '$lib/utils/contactManager.js';
    import { onMount } from 'svelte';
    import { v4 as uuidv4 } from 'uuid'; // Import the uuid function
    import QrCode from '../QrCode.svelte'; // Import the QrCode component
    import Navbar from '../NavBar.svelte';
    import Clouds from '../clouds.svelte';
    import { darkMode } from '../../lib/stores';
    import { fade, fly } from 'svelte/transition';

    let myName = '';
    let friendName = '';
    let customRoomId = ''; // New input for custom room ID
    let roomId = uuidv4(); // Default room ID
    let message = '';
    let isDarkMode;
	let visible = false;
	let isFormSubmitted = false;

	$: {
		// Update roomId when customRoomId changes
		roomId = customRoomId.trim() || uuidv4();
	}

	const handleSubmit = async () => {
		try {
			await createContact(myName, friendName, roomId);
			message = 'Contact created successfully!';
			isFormSubmitted = true;
			// Reset form fields
			myName = '';
			friendName = '';
			customRoomId = ''; // Reset custom room ID input
			roomId = uuidv4(); // Generate a new UUID for the next contact
		} catch (error) {
			message = 'Failed to create contact. Please try again.';
			console.error(error);
		}
	};


	darkMode.subscribe((value) => {
		isDarkMode = value;
	});
</script>

<style>
    .contact-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        box-sizing: border-box;
        color: var(--navbar-text-color);
        font-family: 'Orbitron', sans-serif;
    }

    .form-container {
        width: 100%;
        max-width: 400px;
        margin-top: 20px;
        padding: 0 20px;
        box-sizing: border-box;
        align-items: center;
        align-self: center;
        align-content: center;
        color: var(--navbar-text-color);
        font-family: 'Orbitron', sans-serif;
    }

    .form-group {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 20px;
        color: #fff;
        width: 100%;
        box-sizing: border-box;
        color: var(--navbar-text-color);
        font-family: 'Orbitron', sans-serif;
        margin-bottom: 30%;
        margin-top: 10%;
    }

    .form-group h2 {
        margin-top: 0;
        margin-bottom: 20px;
        text-align: center;
        font-family: 'Orbitron', sans-serif;
    }

    .form-group label {
        font-weight: bold;
        margin-bottom: 5px;
        display: block;
        color: var(--navbar-text-color);
        font-family: 'Orbitron', sans-serif;
    }

    .form-group input {
        width: 100%;
        padding: 10px;
        margin-bottom: 15px;
        border: none;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.3);
        color: var(--navbar-text-color);
        box-sizing: border-box;
        font-family: 'orbitron', sans-serif;
    }

    .submit-button {
        width: 100%;
        background: rgba(255, 255, 255, 0.3);
        border: none;
        padding: 12px 20px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s ease;
        color: var(--navbar-text-color);
        font-weight: bold;
        font-family: 'Orbitron', sans-serif;
    }

    .submit-button:hover {
        background: rgba(255, 255, 255, 0.5);
    }

    .message {
        margin-top: 15px;
        font-size: 14px;
        color: var(--navbar-text-color);
        text-align: center;
    }

    .qr-container {
        width: 200px; /* Adjust based on desired size */
        height: 200px; /* Adjust based on desired size */
        margin: 20px auto; /* Centers the container horizontally */
    }

    /* Add media query for smaller screens */
    @media (max-width: 500px) {
        .form-container {
            padding: 0 10px;
        }

        .form-group {
            padding: 15px;
        }
    }
</style>

<main class="contact-screen" class:dark-mode={isDarkMode} in:fade={{ duration: 400 }}>
    <Clouds />
    <Navbar title="Create Contact" />
    <div class="form-container">
        {#if !isFormSubmitted}
            <form on:submit|preventDefault={handleSubmit} in:fly={{ y: 50, duration: 500 }}>
                <div class="form-group">
                    <label for="myName">My Name:</label>
                    <input type="text" id="myName" bind:value={myName} required placeholder="Enter your name" />
                    
                    <label for="friendName">Friend Name:</label>
                    <input type="text" id="friendName" bind:value={friendName} required placeholder="Enter your friend's name" />
                    
                    <label for="customRoomId">Room ID (optional):</label>
                    <input type="text" id="customRoomId" bind:value={customRoomId} placeholder="Enter custom room ID or leave blank" />
                    
                    <p>Room ID: {roomId}</p>
                    
                    <p>Scan the QR code to add your friend:</p>
                        
                    <div class="qr-container">
                        <QrCode {roomId} />
                    </div>
                        
                   
                    
                    <button type="submit" class="submit-button">Create Contact</button>
                </div>
            </form>
        {:else}
            <div class="form-group" in:fly={{ y: 50, duration: 500 }}>
                <h2>Contact Created!</h2>
                {#if message}
                    <p class="message">{message}</p>
                {/if}
                {#if roomId}
                    <div class="qr-container">
                        <QrCode {roomId} />
                    </div>
                {/if}
                <button class="submit-button" on:click={() => isFormSubmitted = false}>Create Another Contact</button>
            </div>
        {/if}
    </div>
</main>
