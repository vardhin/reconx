<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { darkMode } from '../lib/stores';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';

	const MAX_STARS = 50;
	const MAX_CLOUDS = 4;
	const FPS = 60;
	const FRAME_INTERVAL = 1000 / FPS;

	let stars: Star[] = [];
	let clouds: Cloud[] = [];
	let animationFrame: number | null = null;
	let lastFrameTime = 0;

	class Star {
		id: string;
		x: number;
		y: number;
		opacity: number;
		scale: number;
		isShooting: boolean;
		speed: number;
		twinkleSpeed: number;
		twinkleOffset: number;

		constructor() {
			this.id = Math.random().toString(36).substring(2);
			this.x = Math.random() * 100;
			this.y = Math.random() * 100;
			this.opacity = Math.random() * 0.5 + 0.5;
			this.scale = Math.random() * 0.7 + 0.3;
			this.isShooting = false;
			this.speed = Math.random() * 0.02 + 0.01;
			this.twinkleSpeed = Math.random() * 0.003 + 0.001;
			this.twinkleOffset = Math.random() * Math.PI * 2;
		}

		animate(deltaTime: number): boolean {
			if (this.isShooting) {
				this.x -= this.speed * deltaTime * 0.5;
				this.y += this.speed * deltaTime * 0.5;
				this.opacity -= 0.0005 * deltaTime;
				this.scale -= 0.0002 * deltaTime;
			} else {
				this.opacity = 0.5 + Math.sin(performance.now() * this.twinkleSpeed + this.twinkleOffset) * 0.5;
			}

			if (!this.isShooting && Math.random() < 0.00002 * deltaTime) {
				this.isShooting = true;
			}

			return this.opacity > 0 && this.x >= -20 && this.y <= 120;
		}
	}

	class Cloud {
		id: string;
		x: number;
		y: number;
		speed: number;
		scale: number;
		opacity: number;

		constructor() {
			this.id = Math.random().toString(36).substring(2);
			this.x = Math.random() * -100 - 50;
			this.y = Math.random() * 90;
			this.speed = Math.random() * 0.015 + 0.009;
			this.scale = Math.random() * 0.5 + 0.5;
			this.opacity = Math.random() * 0.5 + 0.5;
		}

		animate(deltaTime: number): boolean {
			this.x += this.speed * deltaTime * 0.35;
			this.opacity = Math.min(this.opacity + 0.005 * deltaTime, 1);
			this.x = Math.round(this.x * 10000) / 10000;
			return this.x <= 120;
		}
	}

	function spawnStar(): void {
		stars = [...stars, new Star()];
	}

	function spawnCloud(): void {
			clouds = [...clouds, new Cloud()];
	}

	function gradualCloudSpawn(count = MAX_CLOUDS, minInterval = 3000, maxInterval = 10000): void {
		let spawned = 0;
		const spawn = () => {
			if (spawned < count) {
				spawnCloud();
				spawned++;
				const nextInterval = Math.random() * (maxInterval - minInterval) + minInterval;
				setTimeout(spawn, nextInterval);
			}
		};
		spawn();
	}

	function animationLoop(currentTime: number): void {
		if (!browser) return;

		animationFrame = requestAnimationFrame(animationLoop);

		const deltaTime = currentTime - lastFrameTime;

		if (deltaTime >= FRAME_INTERVAL) {
			lastFrameTime = currentTime - (deltaTime % FRAME_INTERVAL);

			if ($darkMode) {
				stars = stars.filter(star => star.animate(deltaTime));
				while (stars.length < MAX_STARS) {
					spawnStar();
				}
			} else {
				clouds = clouds.filter(cloud => cloud.animate(deltaTime));
				while (clouds.length < MAX_CLOUDS) {
					spawnCloud();
				}
			}
		}
	}

	onMount(() => {
		if ($darkMode) {
			for (let i = 0; i < MAX_STARS / 5; i++) {
				setTimeout(spawnStar, i * 200);
			}
		} else {
			gradualCloudSpawn();
		}
		if (browser) {
			animationLoop(0);
		}
	});

	onDestroy(() => {
		if (browser && animationFrame !== null) {
			cancelAnimationFrame(animationFrame);
		}
	});

	// Reactive statements for dark mode changes
	$: if ($darkMode) {
		clouds = [];
		if (stars.length === 0) {
			stars = Array.from({ length: MAX_STARS / 5 }, () => new Star());
		}
	} else {
		stars = [];
		if (clouds.length === 0) {
			gradualCloudSpawn();
		}
	}
</script>

{#if $darkMode}
	<div class="stars">
		{#each stars as star (star.id)}
			<div
				class="star"
				style="
					transform: translate3d({star.x}vw, {star.y}vh, 0) scale({star.scale});
					opacity: {star.opacity};
					filter: blur({star.isShooting ? '1px' : '0px'});
				"
			></div>
		{/each}
	</div>
{:else}
	<div class="clouds">
		{#each clouds as cloud (cloud.id)}
			<div
				class="cloud"
				style="
					transform: translate3d({cloud.x}vw, {cloud.y}vh, 0) scale({cloud.scale});
					opacity: {cloud.opacity};
				"
			></div>
		{/each}
	</div>
{/if}

<style>
	.stars,
	.clouds {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
	}

	.star,
	.cloud {
		position: absolute;
		top: 0;
		left: 0;
		will-change: transform, opacity;
	}

	.star {
		width: 2px;
		height: 2px;
		background: white;
		border-radius: 50%;
		box-shadow: 0 0 10px 1px rgba(255, 255, 255, 0.7);
		transition: transform 0.5s ease, opacity 0.5s ease, filter 0.5s ease;
		transform: translateZ(0);
	}

	.cloud {
		width: 200px;
		height: 80px;
		background: #fff;
		border-radius: 100px;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.3s ease, opacity 2s ease;
		transform: translateZ(0);

		
	}

	.cloud::before,
	.cloud::after {
		content: '';
		position: absolute;
		background: #fff;
		border-radius: 50%;
	}

	.cloud::before {
		width: 100px;
		height: 100px;
		top: -50px;
		left: 20px;
	}

	.cloud::after {
		width: 120px;
		height: 120px;
		top: -60px;
		right: 60px;

		
	}
</style>
