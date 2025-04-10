// content_script.js
// Simple extraction - gets all visible text. Might include junk.
// A more robust solution might use libraries like Mozilla's Readability.js
// or target specific elements like <article> or <main>.
document.body.innerText;