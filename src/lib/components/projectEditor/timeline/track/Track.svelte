<script lang="ts">
	let { name, icon } = $props();
</script>

<div class="track-container track-lane">
	<div class="track-header">
		<span class="material-icons text-base opacity-80">{icon}</span>
		<span class="text-[var(--text-secondary)] text-xs font-medium truncate">{name}</span>
	</div>
</div>

<style>
	.track-lane {
		flex: 1;
		min-height: 60px;
		border-bottom: 1px solid var(--timeline-track-border);
		position: relative;
		background: linear-gradient(90deg, var(--timeline-bg-accent) 0%, transparent 200px);
	}

	.track-lane:hover {
		background: linear-gradient(90deg, rgba(88, 166, 255, 0.05) 0%, transparent 200px);
	}

	.track-header {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 180px;
		background: linear-gradient(
			135deg,
			var(--timeline-bg-accent) 0%,
			var(--timeline-bg-secondary) 100%
		);
		border-right: 1px solid var(--timeline-track-border);
		display: flex;
		align-items: center;
		padding: 0 12px;
		gap: 8px;
		z-index: 5;
	}

	.track-icon {
		font-size: 16px;
		opacity: 0.8;
	}

	.track-name {
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
</style>
