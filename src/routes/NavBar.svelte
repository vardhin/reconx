<script>
	import { goto } from '$app/navigation';
	import { darkMode } from '../lib/stores';
	import { get } from 'svelte/store';

	// Import FontAwesome icons
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faArrowLeft, faSun, faMoon, faRedoAlt } from '@fortawesome/free-solid-svg-icons'; // Add reload icon
	// Add this import for the thicker icons
	import { faArrowLeft as faArrowLeftSolid, faSun as faSunSolid, faMoon as faMoonSolid, faRedoAlt as faRedoAltSolid } from '@fortawesome/free-solid-svg-icons';

	export let title = ''; // Ensure title is passed as a prop

	let isDarkMode = false;
	darkMode.subscribe((value) => {
		isDarkMode = value;
	});

	const goBack = () => {
		history.back();
	};

	const toggleTheme = () => {
		darkMode.set(!get(darkMode));
	};

	const reloadPage = () => {
		location.reload(); // Reload the page
	};
</script>

<nav class:dark-mode={isDarkMode}>
	<div class="button-container">
		<div class="back-button" on:click={goBack}>
			<FontAwesomeIcon icon={faArrowLeftSolid} class="icon" />
		</div>
		<div class="reload-button" on:click={reloadPage}>
			<FontAwesomeIcon icon={faRedoAltSolid} class="icon" />
		</div>
	</div>
	<div class="title">
		<h1>{title}</h1>
	</div>
	
	<div class="theme-toggle" on:click={toggleTheme}>
		<div class="theme-button" class:dark-mode={isDarkMode}>
			{#if isDarkMode}
			<FontAwesomeIcon icon={faMoonSolid} class="icon" />
			{:else}
			<FontAwesomeIcon icon={faSunSolid} class="icon" />
			{/if}
		</div>
	</div>
</nav>

<style>
	nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--navbar-bg-color);
		color: var(--navbar-text-color);
		padding: 5px 10px;
		height: 60px; /* Increased from 50px to 60px */
		box-sizing: border-box;
		transition:
			background-color 0.3s ease,
			color 0.3s ease;
		backdrop-filter: blur(2px);
		font-family: 'Orbitron', sans-serif;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.15);
		width: 100%; /* Ensure full width */
	}

	.back-button, .theme-toggle, .reload-button {
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 0 3px;
		margin: 0 3px;
	}

	.title h1 {
		font-size: 1.4rem; /* Reduce font size */
		margin: 0;
		font-weight: 600;
		text-align: center;
		flex-grow: 1;
	}

	.button-container {
		display: flex;
		align-items: center;
	}

	/* Add these global styles */
	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
	}

	:global(#svelte) {
		position: relative;
		width: 100%;
		overflow-x: hidden;
	}

	.theme-toggle {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		margin: 0 3px;
	}

	.theme-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, #ffb74d 30%, #ffa726 100%); /* light mode: amber gradient */
    border: none;
    box-shadow: 0 0 10px rgba(255, 183, 77, 0.65), 0 0 20px rgba(255, 183, 77, 0.65), 0 0 30px rgba(255, 183, 77, 0.65); /* light mode: amber shadows */
    transition: all 0.3s ease;
}

	.theme-button:hover {
		transform: scale(1.1);
	}

	.theme-button:active {
		transform: scale(0.95);
	}

	.theme-button.dark-mode {
		background: radial-gradient(circle, #c0c0c0 30%, #708090 100%);
		box-shadow: 0 0 10px #708090, 0 0 20px #708090, 0 0 30px #708090;
	}

	@keyframes sunShine {
        0%, 100% {
            box-shadow: 0 0 10px rgba(255, 183, 77, 0.65), 0 0 20px rgba(255, 183, 77, 0.65), 0 0 30px rgba(255, 183, 77, 0.65); /* light mode: amber */
        }
        50% {
            box-shadow: 0 0 15px rgba(255, 183, 77, 1), 0 0 30px rgba(255, 183, 77, 1), 0 0 45px rgba(255, 183, 77, 1); /* light mode: amber */
        }
    }

	@keyframes moonGlow {
		0%, 100% {
			box-shadow: 0 0 10px #708090, 0 0 20px #708090, 0 0 30px #708090;
		}
		50% {
			box-shadow: 0 0 15px #708090, 0 0 30px #708090, 0 0 45px #708090;
		}
	}

	.theme-button {
		animation: sunShine 3s infinite;
	}

	.theme-button.dark-mode {
		animation: moonGlow 3s infinite;
	}

</style>
