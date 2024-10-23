<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
	import NavBar from './NavBar.svelte';
	import { darkMode } from '../lib/stores';
	import { fade } from 'svelte/transition';
	import FooterBar from './Footer.svelte';
	import Clouds from './clouds.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faHome, faCog, faPlus } from '@fortawesome/free-solid-svg-icons';
	import { getAllContacts } from '../lib/utils/contactManager';

	let contacts = [];
	let isDarkMode;
	let visible = false;

	async function fetchContacts() {
		try {
			contacts = await getAllContacts();
		} catch (e) {
			console.error('Error fetching contacts:', e);
		}
	}

	onMount(() => {
		fetchContacts();
		setTimeout(() => {
			visible = true;
		}, 100);
	});

	function openChat(myName, friendName) {
		goto(`/chat?myName=${myName}&friendName=${friendName}`);
	}

	const navigateToCreateContact = () => {
		goto('/contact');
	};

	darkMode.subscribe((value) => {
		isDarkMode = value;
	});

	function handleClick(action) {
		console.log(`Action: ${action}`); // Log the action
		switch (action) {
			case 'home':
				console.log('Navigating to home');
				break;
			case 'settings':
				console.log('Navigating to settings');
				break;
			case 'add':
				console.log('Navigating to contact page');
				window.location.href = '/contact'; // Use window.location.href for testing
				break;
			default:
				console.log(`Clicked: ${action}`);
		}
	}

	function handleFooterClick(event) {
		const action = event.detail;
		console.log(`Footer action: ${action}`); // Log the action
		switch (action) {
			case 'home':
				console.log('Navigating to home');
				goto('/');
				break;
			case 'settings':
				console.log('Navigating to settings');
				goto('/settings');
				break;
			case 'add':
				console.log('Navigating to contact page');
				goto('/contact');
				break;
			default:
				console.log(`Unhandled action: ${action}`);
		}
	}
</script>

<NavBar title="Recon" />
<main class="contact-screen" class:dark-mode={isDarkMode} in:fade={{ duration: 400 }}>
	<Clouds />
	<div class="contact-list">
		{#if visible}
			{#each contacts as contact}
				<button
					class="contact-button"
					on:click={() => openChat(contact.MyName, contact.FriendName)}
					in:fade={{ duration: 400 }}
				>
					{contact.FriendName}
				</button>
			{/each}
		{/if}
	</div>
	<FooterBar on:buttonClick={handleFooterClick} />
</main>

<style>
.contact-list {
	padding-bottom: 80px; /* Add padding to the bottom of the contact list */
}
</style>
