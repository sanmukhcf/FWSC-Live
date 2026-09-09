import crypto from 'crypto';
import type { DuplicatePair } from '../../src/types';

export class DuplicateContentAnalyzer {
  static analyze(pageTexts: Array<{ url: string; text: string }>): DuplicatePair[] {
    const pairs: DuplicatePair[] = [];
    if (pageTexts.length < 2) return pairs;

    // Filter out pages with almost no text (< 30 words)
    const validPages = pageTexts
      .map(p => {
        const normalized = p.text
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const words = normalized.split(' ').filter(w => w.length > 2);
        const hash = crypto.createHash('md5').update(normalized).digest('hex');
        const shingles = this.createShingles(words, 4);

        return {
          url: p.url,
          wordCount: words.length,
          hash,
          shingles,
        };
      })
      .filter(p => p.wordCount >= 20);

    // Limit pairwise comparison to top 60 pages to maintain snappy performance
    const cappedPages = validPages.slice(0, 60);

    for (let i = 0; i < cappedPages.length; i++) {
      for (let j = i + 1; j < cappedPages.length; j++) {
        const pageA = cappedPages[i];
        const pageB = cappedPages[j];

        // 1. Exact hash match
        if (pageA.hash === pageB.hash && pageA.wordCount > 0) {
          pairs.push({
            pageA: pageA.url,
            pageB: pageB.url,
            similarityPercentage: 100,
            type: 'exact',
          });
          continue;
        }

        // 2. Jaccard Shingling Similarity
        const similarity = this.calculateJaccardSimilarity(pageA.shingles, pageB.shingles);

        if (similarity >= 70) {
          pairs.push({
            pageA: pageA.url,
            pageB: pageB.url,
            similarityPercentage: Math.round(similarity),
            type: similarity >= 95 ? 'exact' : 'near',
          });
        }
      }
    }

    // Sort by highest similarity first
    pairs.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
    return pairs;
  }

  private static createShingles(words: string[], k: number = 4): Set<string> {
    const shingles = new Set<string>();
    if (words.length < k) {
      if (words.length > 0) {
        shingles.add(words.join(' '));
      }
      return shingles;
    }

    for (let i = 0; i <= words.length - k; i++) {
      const shingle = words.slice(i, i + k).join(' ');
      shingles.add(shingle);
    }
    return shingles;
  }

  private static calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersectionSize = 0;
    const [smaller, larger] = setA.size < setB.size ? [setA, setB] : [setB, setA];

    for (const item of smaller) {
      if (larger.has(item)) {
        intersectionSize++;
      }
    }

    const unionSize = setA.size + setB.size - intersectionSize;
    if (unionSize === 0) return 0;

    return (intersectionSize / unionSize) * 100;
  }
}
