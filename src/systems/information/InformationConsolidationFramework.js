// File: src/systems/information/InformationConsolidationFramework.js
/**
 * Information Consolidation Framework
 * 
 * Tracks the ratio of Fact to Fabrication and determines 
 * if a society is accumulating Knowledge or Noise.
 */
export class InformationConsolidationFramework {
    constructor() {
        this.dataPoints = [];
        this.globalMetrics = {
            facts: 0,
            rumors: 0,
            fabrications: 0,
            verifications: 0,
            signalToNoise: 1.0,
            knowledgeIndex: 0.0
        };
    }

    /**
     * Ingest new information into the system.
     */
    ingestInfo(type, content, reliability) {
        const point = {
            id: `Info_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            type, // Fact, Rumor, Fabrication
            content,
            reliability, // [0.0 - 1.0]
            isVerified: false,
            timestamp: Date.now()
        };

        this.dataPoints.push(point);
        this.updateGlobalMetrics();
    }

    /**
     * Perform a "Verification Event" (e.g., historical audit or physical discovery).
     */
    verifyInfo(infoId) {
        const point = this.dataPoints.find(p => p.id === infoId);
        if (point && !point.isVerified) {
            point.isVerified = true;
            point.reliability = 1.0;
            this.globalMetrics.verifications++;
            this.updateGlobalMetrics();
        }
    }

    updateGlobalMetrics() {
        this.globalMetrics.facts = this.dataPoints.filter(p => p.type === 'Fact').length;
        this.globalMetrics.rumors = this.dataPoints.filter(p => p.type === 'Rumor').length;
        this.globalMetrics.fabrications = this.dataPoints.filter(p => p.type === 'Fabrication').length;

        const total = this.dataPoints.length || 1;
        const noise = this.globalMetrics.rumors + this.globalMetrics.fabrications;
        
        // Signal-to-Noise Ratio
        this.globalMetrics.signalToNoise = this.globalMetrics.facts / (noise || 1);

        // Knowledge Quality Index [0.0 - 1.0]
        // Weighted by reliability of data points
        const avgReliability = this.dataPoints.reduce((acc, p) => acc + (p.reliability || 0), 0) / total;
        const verificationWeight = (this.globalMetrics.verifications / total) * 0.4;
        
        this.globalMetrics.knowledgeIndex = Math.min(1.0, (avgReliability * 0.6) + verificationWeight);
    }

    /**
     * Generate: Global Knowledge Quality Index
     */
    generateEntropyReport() {
        return {
            title: "Information Entropy Bureau Report",
            metrics: {
                knowledgeQualityIndex: this.globalMetrics.knowledgeIndex.toFixed(3),
                signalToNoise: this.globalMetrics.signalToNoise.toFixed(2),
                activeVerifications: this.globalMetrics.verifications
            },
            analysis: {
                isConsolidating: this.globalMetrics.knowledgeIndex > 0.6,
                isDecaying: this.globalMetrics.signalToNoise < 0.3,
                conclusion: this.globalMetrics.knowledgeIndex > 0.6 ? 
                    "Information is successfully consolidating into Knowledge." :
                    "High Entropy detected: Fabrication and Rumor are overwhelming the Signal."
            }
        };
    }
}
