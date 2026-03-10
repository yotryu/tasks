<script lang="ts">
	import { resolve } from "$app/paths";
	import { gapiUtils } from "$lib/gapiUtils.svelte";
	import type { FileInfo } from "$lib/types";
	import { onMount } from "svelte";

	let boardsAvailable: FileInfo[] = $state([]);
	let waitingForBoards: boolean = $state(true);
	let addingBoard: boolean = $state(false);


	async function AddBoard()
	{
		const input = <HTMLInputElement>document.getElementById("input-new-board-name");
		const name = input.value;

		console.log(name);

		if (!name || name.length == 0)
		{
			return;
		}

		addingBoard = true;

		const boardFileId = await gapiUtils.CreateBoard(name);

		addingBoard = false;

		if (boardFileId)
		{
			console.log(`Created board '${name}' successfully: ${boardFileId}`);
			TryGetAllBoards();
		}
		else
		{
			console.log(`Failed to create board '${name}'`);
		}
	}

	async function TryGetAllBoards()
	{
		waitingForBoards = true;

		if (!gapiUtils.authenticated)
		{
			// not authenticated yet, try again in a second
			setTimeout(() => TryGetAllBoards(), 1000);
			return;
		}

		boardsAvailable = await gapiUtils.GetAllBoards();

		waitingForBoards = false;
	}

	onMount(async () => {
		TryGetAllBoards();
	});
</script>


{#if gapiUtils.authenticated}
	{#if waitingForBoards}
		<div>Getting boards...</div>
	{:else}
		<div>Boards</div>
		{#each boardsAvailable as board}
			<div>
				<button class="board-panel" disabled={addingBoard}
					onclick={() => window.location.assign(resolve(`/board`) + `?active=${board.name}`)}>{board.name}</button>
			</div>
		{/each}

		<div class="board-panel-div">
			<input class="text-input" type="text" id="input-new-board-name" placeholder="Enter new board name"/>
			<button class="new-board-button" disabled={addingBoard}
				onclick={() => AddBoard()}>{addingBoard ? "Adding Board..." : "Add New Board"}</button>
		</div>
	{/if}
{/if}


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

	.board-panel, .board-panel-div {
		font-family: Exo2-Regular;
		background-color: #000A;
		color: azure;
		border: 0;
		border-radius: 12px;
		margin: 0.5em 0.5em 0.5em 0;
		padding: 1em;
		width: 300px;
		text-align: left;
		position: relative;
		cursor: pointer;
	}

	.board-panel-div {
		padding: 0.5em;
		width: calc(300px - 1em);
		cursor: unset;
	}

	.text-input {
		font-family: Exo2-Regular;
		width: calc(100% - 8px);
		border: none;
		border-radius: 6px;
		margin: 0 0 0.5em 0;
		padding: 4px;
	}

	.new-board-button {
		font-family: Exo2-Regular;
		background-color: #000A;
		color: azure;
		border: 0;
		border-radius: 8px;
		margin: 0;
		padding: 0.5em 1em;
		width: 100%;
		position: relative;
	}

	.new-board-button:hover {
		background-color: #333A;
	}
</style>