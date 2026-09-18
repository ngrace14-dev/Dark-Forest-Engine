/**
 * File: src_systems_navigation_careers.js
 * Boilerplate for the Shift Navigator career.
 */
window.NavigatorManager = {
    predictNextShift: function() {
        const level = window.CareerManager.stats.navigator.level;
        if (level < 10) return "Predictions are foggy...";
        
        // Shift Navigators can "see" the math of the next Epoch Seed
        // Provide a hint about where the Capital's chain will swing next
        return "The forest pulls to the North-East in the coming shift.";
    }
};
