<script lang="ts">
	import { resolve } from "$app/paths";
	import { gapiUtils } from "$lib/gapiUtils.svelte";
	import type { FileInfo } from "$lib/types";
	import { onMount } from "svelte";

	let boardsAvailable: FileInfo[] = $state([]);


	async function AddBoard(name: string)
	{
		const boardFileId = await gapiUtils.CreateBoard(name);
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
		if (!gapiUtils.authenticated)
		{
			// not authenticated yet, try again in a second
			setTimeout(() => TryGetAllBoards(), 1000);
			return;
		}

		boardsAvailable = await gapiUtils.GetAllBoards();
	}

	onMount(async () => {
		TryGetAllBoards();
	});
</script>


{#if gapiUtils.authenticated}
	{#each boardsAvailable as board}
		<button onclick={() => window.location.assign(resolve(`/board`) + `?active=${board.name}`)}>{board.name}</button>
	{/each}

	<button onclick={() => AddBoard("test")}>Add Board</button>
{/if}