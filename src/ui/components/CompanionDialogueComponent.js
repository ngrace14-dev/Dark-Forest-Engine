import { UIComponent } from '../core/UIComponent.js';

export class CompanionDialogueComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
        // Pre-bind for DOM handlers
        this.close = this.close.bind(this);
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        // Setup global helper until everything is decoupled
        window.closeCompanionDialogue = this.close;
        
        // This component doesn't inherently listen to a single "RENDER" event 
        // as it handles many distinct sub-views natively via old functions.
        // It's mainly a base to provide `this.element` and `this.close`.
    }

    close() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
    }
}
