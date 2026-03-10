<script lang="ts">
    import StatusColumn from "$lib/StatusColumn.svelte";
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
	
	// data state
	let activeBoardId: string = $state("");
	let workingData: BoardSaveData = $state(<BoardSaveData>JSON.parse(JSON.stringify(basicData)));

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
		<div class="columns-container">
			{#each workingData.statuses as status}
				<StatusColumn 
					status={status} 
					cards={workingData.cards.filter(c => c.status == status.id)} 
					onMove={(val) => MoveStatus(status.id, val)}
					onEditStatus={(status) => UpdateStatus(status)}
					onNewCard={() => NewCard(status.id)}
					onEditCard={(card) => UpdateCard(card)}/>
			{/each}

			<StatusColumn status={null} cards={[]} onNewStatus={() => NewStatus()}/>
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
</style>