/**
 * LLM Prompt Templates for Insights Generation
 */

const promptTemplates = {
  seniorDataAnalyst: {
    name: "Senior Data Analyst",
    prompt: `As a Senior Data Analyst with expertise in exploratory data analysis, review the following dataset insights:

{{INSIGHTS}}

Please provide a comprehensive analysis that includes:
1. The most significant patterns and trends in the data
2. Potential business implications of these findings
3. Recommended actions based on the data
4. Areas that require further investigation

Focus on practical, actionable insights with specific recommendations.`
  },
  executiveSummary: {
    name: "Executive Summary",
    prompt: `Create an executive summary of the following data analysis:

{{INSIGHTS}}

The summary should:
1. Highlight 3-5 key findings in clear, non-technical language
2. Identify business implications and potential revenue impacts
3. Present strategic recommendations based on the data
4. Be concise and focused on decision-making information`
  },
  marketingInsights: {
    name: "Marketing Strategy",
    prompt: `As a Marketing Strategist, analyse this dataset to identify marketing opportunities:

{{INSIGHTS}}

Your response should include:
1. Customer segmentation insights
2. Targeting recommendations based on the data
3. Specific marketing tactics that could yield results
4. Success metrics to track and KPIs to establish`
  },
  dataScientist: {
    name: "Data Scientist",
    prompt: `Analyse the following dataset from a data science perspective:

{{INSIGHTS}}

Your response should include:
1. Evaluation of the statistical soundness of the findings
2. Identification of potential confounding variables
3. Recommendations for advanced modelling approaches
4. Suggestions for additional data that could strengthen the analysis`
  },
  australianContext: {
    name: "Australian Market Context",
    prompt: `Analyse the following dataset in the context of the Australian market:

{{INSIGHTS}}

Your response should:
1. Highlight findings particularly relevant to Australian consumers and businesses
2. Compare patterns to typical Australian market trends
3. Suggest approaches that would work well in the Australian business environment
4. Identify any regulatory or cultural considerations specific to Australia`
  }
};

// Export the templates
if (typeof module !== 'undefined' && module.exports) {
  module.exports = promptTemplates;
}