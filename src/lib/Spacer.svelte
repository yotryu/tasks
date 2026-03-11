<script lang="ts">
	let { index, showHover, onHoverChange }: {
		index: number,
		showHover: boolean,
		onHoverChange?: (isHovering: boolean, index: number) => void
	} = $props();

	let isHovering = $state(false);

	function OnHoverSpacerStart()
	{
		isHovering = true;
		onHoverChange ? onHoverChange(true, index) : {};
	}

	function OnHoverSpacerEnd()
	{
		isHovering = false;
		onHoverChange ? onHoverChange(false, index) : {};
	}
</script>


<div class="spacer {showHover && isHovering ? "highlight" : ""}" role="toolbar" tabindex="0"
	onmouseenter={() => OnHoverSpacerStart()} onmouseleave={() => OnHoverSpacerEnd()}>
</div>


<style>
	.spacer {
		height: 6px;
		border-radius: 4px;
		margin: 4px 0 4px 0;
	}

	.highlight {
		background-color: goldenrod;
	}
</style>