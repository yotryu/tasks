<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { gapiUtils } from '$lib/gapiUtils.svelte';
    import { onMount } from 'svelte';

	let { children } = $props();


	function proxyClick(id: string)
    {
        let element = document.getElementById(id);
        if (!element)
        {
            return;
        }
        
        element.click();
    }

	onMount(async () => {
		await gapiUtils.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if gapiUtils.loaded && !gapiUtils.authenticated}
	<!-- Not authenticated yet -->
	<div class="overlay-darken center-parent">
		<div class="center-login">
			{#if !gapiUtils.authKey || gapiUtils.authKey.length == 0}
				<!-- Need an auth key - very first thing we'll likely see in a new env -->
				<button class="add-button" onclick={() => proxyClick("chooseAuthKeyFile")}>Load API Key</button>
				<input id="chooseAuthKeyFile" type="file" accept=".txt" multiple onchange={(evt) => gapiUtils.initWithAuthKeyFile(evt)} style="display:none;"/>
			{:else}
				<!-- Everything is loaded, so now we can present login options -->
				<h1 class="title">Login</h1>
				<div class="small-padding">
					<button class="add-button" onclick={() => gapiUtils.doLogin()}>Authenticate</button>
				</div>

				<!-- Button to remove the cached api key -->
				<div class="small-padding">
					<button class="add-button red-button" onclick={() => gapiUtils.removeAPIKey()}>Remove API Key</button>
				</div>
			{/if}
		</div>
	</div>
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

	div, button {
		font-family: Exo2-Regular;
	}

	.overlay-darken {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		color: beige;
	}

	.overlay-darken {
		background-color: #000C;
	}

	.center-parent {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.center-login {
		display: flexbox;
		text-align: center;
	}
</style>