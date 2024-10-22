<script>
	export let onClose;

	const closeModal = () => {
		onClose();
	};
</script>

<div class="modal-backdrop" on:click={closeModal}>
	<div class="modal-content" on:click|stopPropagation>
		<slot></slot>
	</div>
</div>

<style>
	/* Add your modal styling here */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.modal-content {
		background: white;
		padding: 2rem;
		border-radius: 0.5rem;
	}
</style>
