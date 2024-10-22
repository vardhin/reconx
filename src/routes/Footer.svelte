<script>
	import { darkMode } from '../lib/stores';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faHome, faCog, faPlus } from '@fortawesome/free-solid-svg-icons';

	let isDarkMode = false;

	darkMode.subscribe((value) => {
		isDarkMode = value;
	});

	function handleClick(action) {
		// Implement the action for each button
		console.log(`Clicked: ${action}`);
	}
</script>

<footer class:dark-mode={isDarkMode}>
	<div class="button-container">
		<div class="footer-button" on:click={() => handleClick('home')}>
			<FontAwesomeIcon icon={faHome} class="icon" />
		</div>
		<div class="footer-button" on:click={() => handleClick('settings')}>
			<FontAwesomeIcon icon={faCog} class="icon" />
		</div>
	</div>
</footer>

<div class="add-button" on:click={() => handleClick('add')}>
	<FontAwesomeIcon icon={faPlus} class="icon" />
</div>

<style>
	footer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--navbar-bg-color);
		color: var(--navbar-text-color);
		padding: 5px 10px;
		height: 60px;
		box-sizing: border-box;
		transition:
			background-color 0.3s ease,
			color 0.3s ease;
		backdrop-filter: blur(3px);
		font-family: 'Orbitron', sans-serif;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.15);
		width: 100%;
	}

	.button-container {
		display: flex;
		align-items: center;
		justify-content: space-around;
		width: 100%;
	}

	.footer-button {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 3px;
		margin: 0 3px;
		width: 40px;
		height: 40px;
	}

	.icon {
		width: 20px;
		height: 20px;
		transition: transform 0.3s ease;
		color: inherit;
		text-shadow: 0 0 1px currentColor, 0 0 1px currentColor;
	}

	.footer-button:hover .icon {
		transform: scale(1.1);
		text-shadow: 0 0 2px currentColor, 0 0 2px currentColor;
	}

	.add-button {
		position: fixed;
		bottom: 30px;
		left: 50%;
		transform: translateX(-50%);
		background-color: var(--accent, #ff8c42);
		border-radius: 50%;
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 0 15px var(--glow-color, rgba(255, 140, 66, 0.7));
		z-index: 1001;
	}

	.add-button .icon {
		color: var(--text-dark, #ffffff);
		width: 24px;
		height: 24px;
	}

	.add-button:hover .icon {
		transform: scale(1.1);
	}
</style>
