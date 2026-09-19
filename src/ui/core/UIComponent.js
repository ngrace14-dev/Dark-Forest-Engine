export class UIComponent {
    constructor(elementId) {
        this.elementId = elementId;
        this.element = document.getElementById(elementId);
    }

    onRegister(eventBus, uiEngine) {
        // Override to setup event bus listeners
    }

    onTick(delta, camera) {
        // Override for per-frame updates (e.g. tracking floating text or 3d tags)
    }

    show() {
        if (this.element) {
            this.element.classList.remove('hidden');
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
    }
    
    toggle() {
        if (this.element) {
            this.element.classList.toggle('hidden');
        }
    }
}
