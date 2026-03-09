// Helper function to allow awaiting on page script load.
// Used by post-gen page.
export function loadScript(src: string)
{
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;

        document.body.appendChild(script);

        script.addEventListener('load', () => resolve(script));
        script.addEventListener('error', () => reject(script));
    });
}