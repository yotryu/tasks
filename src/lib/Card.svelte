<script lang="ts">
    import type { CardMinimalData } from "./types";
	import Pencil from "$lib/assets/pencil.svg";

	let preEditTitle = "";

	let { data, onEditCard }: {
		data: CardMinimalData,
		onEditCard?: (card: CardMinimalData) => void
	} = $props();

	let isHovering = $state(false);
	let isEditingTitle = $state(false);

	let EditTitle = $derived((title: string) => {
		if (isEditingTitle)
		{
			let newData = JSON.parse(JSON.stringify(data));
			newData.title = title;
			onEditCard ? onEditCard(newData) : {};
		}
	});

	function FocusInput(element: HTMLInputElement)
	{
		element.focus();
	}

	function StartEditingTitle()
	{
		preEditTitle = data.title;
		isEditingTitle = true;
	}

	function EndTitleEdits(revert: boolean)
	{
		if (revert)
		{
			EditTitle(preEditTitle);
		}

		isEditingTitle = false;
	}

	function HandleTitleEditKeyDown(evt: KeyboardEvent)
	{
		if (evt.key === "Enter")
		{
			EditTitle((<HTMLInputElement>(evt.target)).value);
			EndTitleEdits(false);
		}
		else if (evt.key === "Escape")
		{
			EndTitleEdits(true);
		}
	}
</script>


<div class="card" role="toolbar" tabindex="0"
	onmouseenter={() => isHovering = true} onmouseleave={() => isHovering = false}>
	<div>
		{#if isEditingTitle}
			<div class="title">
				<!-- svelte-ignore a11y_autofocus -->
				<input class="text-input" type="text" id="input-title" value={data.title} use:FocusInput
					onchange={(evt) => EditTitle((<HTMLInputElement>(evt.target)).value)}
					onkeydown={(evt) => HandleTitleEditKeyDown(evt)}
					onfocusout={() => EndTitleEdits(false)}/>
			</div>
		{:else}
			<span>{data.title}</span>
		{/if}
	</div>

	{#if isHovering}
		<div class="controls-container">
			<button class="control-button" onclick={() => StartEditingTitle()}>
				<img class="button-icon-small" src={Pencil} alt="edit">
			</button>
		</div>
	{/if}
</div>


<style>
	@font-face {
		font-family: Exo2-ExtraLight;
		src: url(/fonts/Exo2-ExtraLight.ttf);
	}
	@font-face {
		font-family: Exo2-Regular;
		src: url(/fonts/Exo2-Regular.ttf);
	}

	input {
		font-family: "Exo2-Regular";
	}

	.card {
		border-radius: 8px;
		background-color: azure;
		padding: 8px;
		vertical-align: top;
		cursor: pointer;
		position: relative;
	}

	.controls-container {
		position: absolute;
		right: 6px;
		top: 5px;
	}

	.control-button {
		background-color: #000A;
		border: none;
		border-radius: 50%;
		margin: 0;
		padding: 4px;
		line-height: 0.5em;
	}

	.control-button:hover {
		background-color: #333A;
	}

	.button-icon-small {
		width: 16px;
		height: 16px;
		margin: 0;
		padding: 0;
	}

	.button-icon-small {
		width: 12px;
		height: 12px;
		margin: 2px;
	}

	.text-input {
		/* width: 100%; */
		border: none;
		border-radius: 6px;
		margin: 0;
		padding: 4px;
	}
</style>