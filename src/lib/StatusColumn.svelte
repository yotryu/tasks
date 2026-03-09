<script lang="ts">
    import Card from "./Card.svelte";
    import type { CardMinimalData, StatusData } from "./types";
	import ChevronLeft from "$lib/assets/chevron-left.svg";
	import ChevronRight from "$lib/assets/chevron-right.svg";
	import Pencil from "$lib/assets/pencil.svg";

	let preEditTitle = "";

	let { status = $bindable(), cards, onMove, onNewCard, onNewStatus, onEditCard }: {
		status: StatusData | null,
		cards: CardMinimalData[],
		onMove?: (val: number) => void,
		onNewCard?: () => void,
		onNewStatus?: () => void,
		onEditCard?: (card: CardMinimalData) => void
	} = $props();

	let columnClass = $derived(status ? "column" : "column-fit-content");

	let isEditingTitle = $state(false);

	let EditTitle = $derived((title: string) => {
		if (status && isEditingTitle)
		{
			status.title = title;
		}
	});

	function FocusInput(element: HTMLInputElement)
	{
		element.focus();
	}

	function StartEditingTitle()
	{
		preEditTitle = status ? status.title : "";
		isEditingTitle = true;
	}

	function EndTitleEdits(revert: boolean)
	{
		if (status && revert)
		{
			status.title = preEditTitle;
		}

		isEditingTitle = false;
	}

	function HandleTitleEditKeyDown(key: string)
	{
		if (key === "Enter")
		{
			isEditingTitle = false;
		}
		else if (key === "Escape")
		{
			EndTitleEdits(true);
		}
	}
</script>


<div class={columnClass}>
	{#if status}
		{#if isEditingTitle}
			<div class="title">
				<!-- svelte-ignore a11y_autofocus -->
				<input class="text-input" type="text" id="input-title" bind:value={status.title} use:FocusInput
					onchange={(evt) => EditTitle((<HTMLInputElement>(evt.target)).value)}
					onkeydown={(evt) => HandleTitleEditKeyDown(evt.key)}
					onfocusout={() => EndTitleEdits(false)}/>
			</div>
		{:else}
			<div class="title">{status.title}</div>
		{/if}

		{#each cards as card}
			<Card data={card} onEditCard={onEditCard}/>
			<div class="spacer"></div>
		{/each}

		{#if !isEditingTitle}
		<div class="controls-container">
			<button class="control-button" onclick={() => StartEditingTitle()}>
				<img class="button-icon-small" src={Pencil} alt="edit">
			</button>
			<button class="control-button" onclick={() => onMove?.call(null, -1)}>
				<img class="button-icon" src={ChevronLeft} alt="left">
			</button>
			<button class="control-button" onclick={() => onMove?.call(null, 1)}>
				<img class="button-icon" src={ChevronRight} alt="right">
			</button>
		</div>
		{/if}

		<div class="span-button">
			<button class="basic-button" onclick={() => onNewCard?.call(null)}>+</button>
		</div>
	{:else}
		<div class="span-button">
			<button class="basic-button" onclick={() => onNewStatus?.call(null)}>Add New Status</button>
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

	button, input {
		font-family: "Exo2-Regular";
	}

	.column, .column-fit-content {
		font-family: "Exo2-Regular";
		border-radius: 12px;
		background-color: grey;
		padding: 8px;
		width: 300px;
		margin-right: 0.5em;
		position: relative;
	}

	.column-fit-content {
		height: 100%;
	}

	.title, .title-disabled {
		margin-bottom: 0.5em;
	}

	.title-disabled {
		color: #CCC;
		font-size: small;
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

	.button-icon, .button-icon-small {
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

	.span-button {
		display: flex;
		flex-grow: 1;
	}

	.basic-button {
		color: white;
		width: 100%;
		background-color: #000A;
		border: none;
		border-radius: 6px;
		margin: 0;
		padding: 4px;
	}

	.basic-button:hover {
		background-color: #333A;
	}

	.spacer {
		height: 10px;
	}

	.text-input {
		/* width: 100%; */
		border: none;
		border-radius: 6px;
		margin: 0;
		padding: 4px;
	}
</style>