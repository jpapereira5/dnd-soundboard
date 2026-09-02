import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const app = mount(App, { target: document.getElementById('app')! })

if (import.meta.env.DEV) {
  // Handy for poking at state from the browser console during development.
  import('./lib/state.svelte').then((state) => ((window as unknown as { __sb: unknown }).__sb = state))
}

export default app
