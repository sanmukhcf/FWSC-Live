import type { Issue, AuditScores } from '../../src/types';

export class ScoreCalculator {
  static calculate(issues: Issue[]): AuditScores {
    // Group issues by category
    const categoryIssues: Record<string, { critical: number; warning: number; info: number }> = {
      Technical: { critical: 0, warning: 0, info: 0 },
      'On-Page': { critical: 0, warning: 0, info: 0 },
      Content: { critical: 0, warning: 0, info: 0 },
      Links: { critical: 0, warning: 0, info: 0 },
      Crawlability: { critical: 0, warning: 0, info: 0 },
    };

    for (const issue of issues) {
      if (issue.severity === 'passed') continue;

      const cat = issue.category;
      if (categoryIssues[cat]) {
        if (issue.severity === 'critical') categoryIssues[cat].critical++;
        else if (issue.severity === 'warning') categoryIssues[cat].warning++;
        else if (issue.severity === 'info') categoryIssues[cat].info++;
      }
    }

    const calcCategory = (
      counts: { critical: number; warning: number; info: number },
      critWeight = 12,
      warnWeight = 5,
      infoWeight = 2
    ): number => {
      const deduction =
        counts.critical * critWeight +
        counts.warning * warnWeight +
        counts.info * infoWeight;
      return Math.max(0, Math.min(100, Math.round(100 - deduction)));
    };

    const technical = calcCategory(categoryIssues['Technical'], 12, 5, 2);
    const onPage = calcCategory(categoryIssues['On-Page'], 10, 4, 1.5);
    const content = calcCategory(categoryIssues['Content'], 12, 5, 2);
    const linkStructure = calcCategory(categoryIssues['Links'], 12, 5, 2);
    const crawlability = calcCategory(categoryIssues['Crawlability'], 15, 6, 2);

    // Weighted Overall Score
    const overall = Math.round(
      technical * 0.25 +
      onPage * 0.25 +
      content * 0.20 +
      linkStructure * 0.15 +
      crawlability * 0.15
    );

    let status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' = 'Good';
    if (overall >= 90) status = 'Excellent';
    else if (overall >= 75) status = 'Good';
    else if (overall >= 55) status = 'Fair';
    else if (overall >= 40) status = 'Poor';
    else status = 'Critical';

    return {
      overall,
      status,
      technical,
      onPage,
      content,
      linkStructure,
      crawlability,
    };
  }
}
