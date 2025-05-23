/**
 * LLM Export functionality for the EDA App
 * Handles generating and exporting insights and prompts for LLMs
 */
document.addEventListener('DOMContentLoaded', () => {
  const promptTemplateSelect = document.getElementById('promptTemplateSelect');
  const promptPreview = document.getElementById('promptPreview');
  const llmInsightSummary = document.getElementById('llmInsightSummary');
  const copyInsightsBtn = document.getElementById('copyInsightsBtn');
  const saveInsightsBtn = document.getElementById('saveInsightsBtn');
  const copyPromptBtn = document.getElementById('copyPromptBtn');

  // Initialize event listeners
  if (promptTemplateSelect) {
    promptTemplateSelect.addEventListener('change', updatePromptPreview);
  }

  if (copyInsightsBtn) {
    copyInsightsBtn.addEventListener('click', () => {
      copyToClipboard(llmInsightSummary.innerText);
    });
  }

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', () => {
      copyToClipboard(promptPreview.innerText);
    });
  }

  if (saveInsightsBtn) {
    saveInsightsBtn.addEventListener('click', () => {
      saveInsightsToFile();
    });
  }

  // Hook into analysis tab to update LLM section when insights are available
  const analyzeTab = document.getElementById('analyze-tab');
  const integrityTab = document.getElementById('integrity-tab');
  
  if (analyzeTab) {
    analyzeTab.addEventListener('click', () => {
      // Set a timeout to check for insights after they've loaded
      setTimeout(updateLLMInsightsFromAnalysis, 1000);
    });
  }
  
  // Also hook into integrity tab to update LLM insights
  if (integrityTab) {
    integrityTab.addEventListener('click', () => {
      setTimeout(updateLLMInsightsFromIntegrity, 1000);
    });
  }

  /**
   * Update the prompt preview based on selected template
   */
  function updatePromptPreview() {
    const selectedTemplate = promptTemplateSelect.value;
    if (window.promptTemplates && window.promptTemplates[selectedTemplate]) {
      let promptText = window.promptTemplates[selectedTemplate].prompt;
      
      // If we have insights, replace the placeholder with actual insights
      const insights = llmInsightSummary.innerText;
      if (insights && insights.trim() !== '' && !insights.includes('Select dataset')) {
        promptText = promptText.replace('{{INSIGHTS}}', insights);
      }
      
      promptPreview.innerText = promptText;
    }
  }

  /**
   * Copy text to clipboard with visual feedback
   */
  function copyToClipboard(text) {
    // Use the exposed API from preload.js if available, otherwise fallback
    if (window.api && window.api.writeToClipboard) {
      window.api.writeToClipboard(text)
        .then(result => {
          if (result.success) {
            showCopyFeedback(event.target);
          } else {
            console.error('Failed to copy: ', result.reason);
          }
        });
    } else {
      // Fallback to navigator clipboard API
      navigator.clipboard.writeText(text)
        .then(() => {
          showCopyFeedback(event.target);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  }

  /**
   * Show visual feedback when copy is successful
   */
  function showCopyFeedback(element) {
    const originalBgColor = element.style.backgroundColor;
    const originalText = element.innerHTML;
    
    element.style.backgroundColor = '#28a745';
    element.innerHTML = '<i class="bi bi-check"></i> Copied!';
    
    setTimeout(() => {
      element.style.backgroundColor = originalBgColor;
      element.innerHTML = originalText;
    }, 2000);
  }

  /**
   * Save insights to a text file
   */
  function saveInsightsToFile() {
    const insights = llmInsightSummary.innerText;
    if (insights.trim() !== '') {
      const fileName = `insights_${new Date().toISOString().split('T')[0]}.txt`;
      
      // Use the exposed API from preload.js if available, otherwise fallback
      if (window.api && window.api.saveFile) {
        window.api.saveFile(fileName, insights)
          .then(result => {
            if (!result.success) {
              console.error('Failed to save file: ', result.reason);
            }
          });
      } else {
        // Fallback to browser download
        const blob = new Blob([insights], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  }

  /**
   * Update LLM insights from analysis tab
   */
  function updateLLMInsightsFromAnalysis() {
    const insightsContent = document.getElementById('insightsContent');
    if (insightsContent && insightsContent.innerText.trim() !== '') {
      // Extract insights
      let insightText = '';
      
      // Add summary section
      const summaryContent = document.getElementById('summaryContent');
      if (summaryContent) {
        insightText += "DATASET SUMMARY:\n" + 
                      summaryContent.innerText.replace(/\s+/g, ' ').trim() + "\n\n";
      }
      
      // Add correlations
      const correlations = document.querySelector('#correlations-content .list-group');
      if (correlations) {
        insightText += "CORRELATIONS:\n" + 
                      correlations.innerText.replace(/\s+/g, ' ').trim() + "\n\n";
      }
      
      // Add insights
      insightText += "INSIGHTS:\n" + insightsContent.innerText.trim();
      
      // Update the LLM insight summary
      llmInsightSummary.innerText = insightText;
      
      // Update the prompt preview
      updatePromptPreview();
    }
  }

  /**
   * Update LLM insights from integrity tab
   */
  function updateLLMInsightsFromIntegrity() {
    // Get current insights text
    let currentText = llmInsightSummary.innerText;
    
    // Add data integrity information if it's available
    const integrityScore = document.getElementById('integrityScore');
    const integrityScoreLabel = document.getElementById('integrityScoreLabel');
    const criticalIssues = document.getElementById('criticalIssuesList');
    const majorIssues = document.getElementById('majorIssuesList');
    const recommendations = document.getElementById('integrityRecommendations');
    const australianContext = document.getElementById('australianContextSummary');
    
    if (integrityScore && integrityScore.innerText !== '?' && 
        !currentText.includes('DATA INTEGRITY ASSESSMENT:')) {
      
      let integrityText = "\n\nDATA INTEGRITY ASSESSMENT:\n";
      integrityText += `Overall Data Quality Score: ${integrityScore.innerText}/100 (${integrityScoreLabel.innerText})\n\n`;
      
      // Add critical issues
      if (criticalIssues && criticalIssues.innerText.trim() !== 'No critical issues found') {
        integrityText += "Critical Issues:\n" + criticalIssues.innerText.trim() + "\n\n";
      }
      
      // Add major issues
      if (majorIssues && majorIssues.innerText.trim() !== 'No major issues found') {
        integrityText += "Major Issues:\n" + majorIssues.innerText.trim() + "\n\n";
      }
      
      // Add Australian context
      if (australianContext && australianContext.innerText.trim() !== 'No Australian context analysis available') {
        integrityText += "Australian Context Analysis:\n" + australianContext.innerText.trim() + "\n\n";
      }
      
      // Add recommendations
      if (recommendations && recommendations.innerText.trim() !== 'No recommendations available') {
        integrityText += "Recommendations:\n" + recommendations.innerText.trim();
      }
      
      // Update the LLM insight summary
      llmInsightSummary.innerText = currentText + integrityText;
      
      // If data integrity template is selected, update the preview
      if (promptTemplateSelect.value === 'dataIntegrityAssessment') {
        updatePromptPreview();
      }
    }
  }
});