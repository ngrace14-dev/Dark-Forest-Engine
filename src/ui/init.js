import { UIEngine } from './core/UIEngine.js';
import { IntelBagComponent } from './components/IntelBagComponent.js';
import { IntelDebugComponent } from './components/IntelDebugComponent.js';
import { OracleBoardComponent } from './components/OracleBoardComponent.js';
import { IntelBrokerComponent } from './components/IntelBrokerComponent.js';
import { CompanionDialogueComponent } from './components/CompanionDialogueComponent.js';

export function initializeUIEngine(eventBus) {
    const engine = new UIEngine(eventBus);
    
    // Register Components
    engine.registerComponent('companion-dialogue', new CompanionDialogueComponent());
    engine.registerComponent('intel-bag', new IntelBagComponent());
    engine.registerComponent('intel-debug', new IntelDebugComponent());
    engine.registerComponent('oracle-board', new OracleBoardComponent());
    engine.registerComponent('intel-broker', new IntelBrokerComponent());
    
    window.UIEngineInstance = engine;
    return engine;
}
