<script lang="ts">
    import StatusColumn from "$lib/StatusColumn.svelte";
	import Card from "$lib/Card.svelte";
	import { gapiUtils } from "$lib/gapiUtils.svelte";
	import { onMount } from "svelte";
    import type { BoardSaveData, CardMinimalData, StatusData } from "$lib/types";

	const basicData: BoardSaveData = {
		board: {
			id: "",
			title: "Untitled",
			description: "New board"
		},
		statuses: [
		],
		cards: [
		]
	};

	let lastDragX = $state(0);
	let lastDragY = $state(0);
	let draggingElement: HTMLElement | null = $state(null);
	let hoveringStatus = $state(-1);
	let hoveringSpacer = $state(-1);
	
	// data state
	let activeBoardId: string = $state("");
	let workingData: BoardSaveData = $state(<BoardSaveData>JSON.parse(JSON.stringify(basicData)));
	let draggingCard = $state(-1);

	let nextStatusId = $derived(() => Math.max(...[0, ...workingData.statuses.map(s => s.id)]) + 1);
	let nextCardId = $derived(() => Math.max(...[0, ...workingData.cards.map(c => c.id)]) + 1);


	let MoveStatus = $derived((id: number, adjust: number) =>
	{
		const fromIndex = workingData.statuses.findIndex(s => s.id == id);
		let toIndex = Math.max(Math.min(fromIndex + adjust, workingData.statuses.length - 1), 0);

		if (fromIndex < 0 || fromIndex == toIndex)
		{
			return;
		}

		// remove from
		const from = workingData.statuses.splice(fromIndex, 1);
		
		// insert to
		workingData.statuses.splice(toIndex, 0, ...from);
	});

	let NewCard = $derived((statusId: number) =>
	{
		const card: CardMinimalData = {
			id: nextCardId(),
			title: "new",
			status: statusId
		};

		workingData.cards.push(card);
		gapiUtils.UploadBoardJson(workingData);
	});

	let NewStatus = $derived(() => {
		const status: StatusData = {
			id: nextStatusId(),
			title: "New"
		};

		workingData.statuses.push(status);
		gapiUtils.UploadBoardJson(workingData);
	});

	let UpdateCard = $derived((card: CardMinimalData) => {
		const index = workingData.cards.findIndex(c => c.id == card.id);
		if (index < 0)
		{
			return;
		}

		workingData.cards[index] = card;
		gapiUtils.UploadBoardJson(workingData);
	});
	
	let UpdateStatus = $derived((status: StatusData) => {
		const index = workingData.statuses.findIndex(c => c.id == status.id);
		if (index < 0)
		{
			return;
		}

		workingData.statuses[index] = status;
		gapiUtils.UploadBoardJson(workingData);
	});

	function StartDraggingCard(cardId: number, evt: MouseEvent)
	{
		draggingCard = cardId;

		evt.preventDefault();

		lastDragX = evt.clientX;
		lastDragY = evt.clientY;

		document.onmouseup = OnMouseUp;
		document.onmousemove = OnMouseMove;
	}

	function OnMouseMove(evt: MouseEvent)
	{
		lastDragX = evt.clientX;
		lastDragY = evt.clientY;
	}

	let OnMouseUp = $derived((evt: MouseEvent) =>
	{
		const cardIndex = workingData.cards.findIndex(c => c.id == draggingCard);
		const newStatus = workingData.statuses.find(s => s.id == hoveringStatus);
		if (cardIndex >= 0 && newStatus)
		{
			// card moved to a new status
			if (workingData.cards[cardIndex].status != newStatus.id)
			{
				const newCard = <CardMinimalData>JSON.parse(JSON.stringify(workingData.cards[cardIndex]));
				newCard.status = newStatus.id;
	
				workingData.cards[cardIndex] = newCard;
				gapiUtils.UploadBoardJson(workingData);
			}
			else
			{
				const statusCards = workingData.cards.filter(c => c.status == newStatus.id);
				const cardStatusIndex = statusCards.findIndex(c => c.id == draggingCard);

				// card moved to a new index inside same status
				if (hoveringSpacer >= 0 && cardStatusIndex != hoveringSpacer)
				{
					// remove from
					const from = workingData.cards.splice(cardIndex, 1);

					let toIndex = hoveringSpacer >= statusCards.length ? workingData.cards.length : workingData.cards.findIndex(c => c.id == statusCards[hoveringSpacer].id);
					
					// insert to
					workingData.cards.splice(toIndex, 0, ...from);

					if (cardIndex == toIndex)
					{
						// didn't do anything of value
						return;
					}

					gapiUtils.UploadBoardJson(workingData);
				}
			}
		}

		draggingCard = -1;

		document.onmouseup = null;
		document.onmousemove = null;
	});

	function SetHoveringStatus(isHovering: boolean, statusId: number)
	{
		hoveringStatus = isHovering ? statusId : -1;
	}

	function SetHoveringSpacer(isHovering: boolean, spaceIndex: number)
	{
		hoveringSpacer = isHovering ? spaceIndex : -1;
	}


	async function TryGetActiveBoardData()
	{
		if (!activeBoardId)
		{
			return;
		}

		if (!gapiUtils.authenticated)
		{
			// not authenticated yet, try again in a second
			setTimeout(() => TryGetActiveBoardData(), 1000);
			return;
		}

		workingData = await gapiUtils.GetBoardData(activeBoardId);
	}

	onMount(async () => {
		activeBoardId = new URLSearchParams(window.location.search).get("active") || "";

		TryGetActiveBoardData();
	});
</script>


{#if gapiUtils.authenticated}
	{#if !activeBoardId}
		<div>No board selected - nothing to display</div>
	{:else if workingData && workingData.board.id}
		<h3 class="title">{workingData.board.title}</h3>
		<div class="columns-container {draggingCard >= 0 ? "drag-cursor" : ""}">
			{#each workingData.statuses as status}
				<StatusColumn 
					status={status} 
					cards={workingData.cards.filter(c => c.status == status.id)} 
					draggingCard={draggingCard}
					onMove={(val) => MoveStatus(status.id, val)}
					onHoverChange={SetHoveringStatus}
					onEditStatus={(status) => UpdateStatus(status)}
					onNewCard={() => NewCard(status.id)}
					onEditCard={(card) => UpdateCard(card)}
					onCardDragStart={StartDraggingCard}
					onSpacerHoverChange={SetHoveringSpacer}/>
			{/each}

			<StatusColumn status={null} cards={[]} onNewStatus={() => NewStatus()}/>

			{#if draggingCard >= 0}
				<div class="dragging" bind:this={draggingElement} style="left:{lastDragX}px; top:{lastDragY}px;" inert>
					<Card data={workingData.cards.find(c => c.id == draggingCard)}/>
				</div>
			{/if}
		</div>
	{:else}
		<div>Loading board data...</div>
	{/if}
{/if}

<div class="saving-toast {gapiUtils.isSaving ? "visible" : "hidden"}">
	Saving...
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

	div {
		font-family: Exo2-Regular;
	}

	.title {
		font-family: Exo2-Regular;
		margin-top: 0;
		margin-bottom: 0.5em;
	}

	.columns-container {
		display: inline-flex;
	}

	.saving-toast {
		color: azure;
		position: fixed;
		right: 0;
		bottom: 0;
		margin: 1em;
		padding: 0.5em 1em;
		transition: all 0.3s ease;
		background-color: #000A;
		border-radius: 12px;
	}

	.visible {
		opacity: 1;
	}

	.hidden {
		opacity: 0;
	}

	.dragging {
		position: absolute;
		left: 0;
		top: 0;
		width: calc(300px - 1em);
		cursor: move;
		z-index: 9;
	}

	.drag-cursor {
		cursor: move;
	}
</style>