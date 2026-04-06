const root = document.querySelector("#assistant-root");

if (root) {
  root.innerHTML = `
    <div class="assistant-ui">
      <p class="assistant-ui__title">Assistant shell placeholder</p>
      <p class="assistant-ui__body">
        This bundle is isolated and can later be replaced with a React-powered assistant without
        changing the rest of the site architecture.
      </p>
    </div>
  `;
}
