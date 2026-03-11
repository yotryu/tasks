<script lang="ts">
    import Card from "./Card.svelte";
    import type { CardMinimalData, StatusData } from "./types";
	import ChevronLeft from "$lib/assets/chevron-left.svg";
	import ChevronRight from "$lib/assets/chevron-right.svg";
	import Pencil from "$lib/assets/pencil.svg";
    import Spacer from "./Spacer.svelte";

	let preEditTitle = "";

	let { status = $bindable(), cards, draggingCard, onMove, onHoverChange, onNewCard, onNewStatus, onEditStatus, onEditCard, onCardDragStart, onSpacerHoverChange }: {
		status: StatusData | null,
		cards: CardMinimalData[],
		draggingCard?: number,
		onMove?: (val: number) => void,
		onHoverChange?: (isHovering: boolean, statusId: number) => void
		onNewCard?: () => void,
		onNewStatus?: () => void,
		onEditStatus?: (status: StatusData) => void,
		onEditCard?: (card: CardMinimalData) => void,
		onCardDragStart?: (cardId: number, evt: MouseEvent) => void,
		onSpacerHoverChange?: (isHovering: boolean, index: number) => void,
	} = $props();

	let columnClass = $derived(status ? "column" : "column-fit-content");
	let isDraggingCardInThis = $derived(draggingCard && draggingCard >= 0 && cards.findIndex(c => c.id == draggingCard) >= 0);

	let isEditingTitle = $state(false);
	let isHovering = $state(false);
	let hoveringSpacer = $state(-1);

	let EditTitle = $derived((title: string) => {
		if (status && isEditingTitle && title != status.title)
		{
			const newData = JSON.parse(JSON.stringify(status));
			newData.title = title;
			
			onEditStatus ? onEditStatus(newData) : {};
		}
	});

	function FocusInput(element: HTMLInputElement)
	{
		element.focus();
	}

	function SetIsHovering(flag: boolean)
	{
		isHovering = flag;
		onHoverChange ? onHoverChange(isHovering, status?.id ?? -1) : {};
	}

	function StartEditingTitle()
	{
		preEditTitle = status ? status.title : "";
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


<div class={columnClass} role="toolbar" tabindex="0"
	onmouseenter={() => SetIsHovering(true)} onmouseleave={() => SetIsHovering(false)}>
	{#if status}
		{#if isEditingTitle}
			<div class="title">
				<input class="text-input" type="text" id="input-title" value={status.title} use:FocusInput
					onchange={(evt) => EditTitle((<HTMLInputElement>(evt.target)).value)}
					onkeydown={(evt) => HandleTitleEditKeyDown(evt)}
					onfocusout={() => EndTitleEdits(false)}/>
			</div>
		{:else}
			<div class="title">{status.title}</div>
		{/if}

		<Spacer index={0} showHover={isDraggingCardInThis ? isDraggingCardInThis : false} onHoverChange={onSpacerHoverChange}/>
		{#each cards as card, index}
			<Card data={card} onEditCard={onEditCard} onDragStart={onCardDragStart}/>
			<Spacer index={index + 1} showHover={isDraggingCardInThis ? isDraggingCardInThis : false} onHoverChange={onSpacerHoverChange}/>
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

	{#if isHovering && draggingCard && draggingCard >= 0 && !isDraggingCardInThis}
		<div class="overlay dotted-border">
			<div class="center-text">Move here</div>
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

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
	}

	.dotted-border {
		border: 4px dotted #000A;
		background-color: #CCCC;
		border-radius: 12px;
		display: flex;
	}

	.center-text {
		text-align: center;
		vertical-align: middle;
		margin: auto;
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