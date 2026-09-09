import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { sanitizeAndNormalizeUrl, resolveAndValidateDns } from './server/security';
import { AuditRepository } from './server/db';
import { CrawlerEngine, AuditExecutionError } from './server/crawler/crawlerEngine';
import type { AuditJob, CrawlProgress, AuditErrorDetails } from './src/types';

// Map of active SSE client response objects by jobId
const sseClients = new Map<string, express.Response[]>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', brand: 'FWSC - Free Website SEO Checker by digiVirus', timestamp: new Date().toISOString() });
  });

  // Start new audit
  app.post('/api/audit/start', async (req, res) => {
    const { url, maxPages } = req.body;

    // Validate and sanitize URL
    const validation = sanitizeAndNormalizeUrl(url);
    if (!validation.isValid) {
      res.status(400).json({
        error: validation.error,
        errorDetails: {
          type: 'invalid_url',
          errorType: 'Invalid URL',
          reason: 'INVALID_URL',
          message: validation.error || 'The entered URL format is invalid.',
          url: url || '',
        },
      });
      return;
    }

    try {
      const parsed = new URL(validation.normalizedUrl);
      const dnsResult = await resolveAndValidateDns(parsed.hostname);
      if (!dnsResult.isValid) {
        res.status(400).json({
          error: dnsResult.message,
          errorDetails: {
            type: dnsResult.reason === 'SSRF_RESTRICTED_IP' ? 'restricted_ip' : 'dns_failed',
            errorType: dnsResult.errorType || 'DNS Resolution Failed',
            reason: dnsResult.reason || 'ENOTFOUND',
            message: dnsResult.message,
            url: validation.normalizedUrl,
          },
        });
        return;
      }
    } catch {
      res.status(400).json({
        error: 'Could not resolve domain address.',
        errorDetails: {
          type: 'dns_failed',
          errorType: 'DNS Resolution Failed',
          reason: 'ENOTFOUND',
          message: 'Could not resolve domain address. Please check that the website exists.',
          url: validation.normalizedUrl,
        },
      });
      return;
    }

    const pagesLimit = Math.min(Math.max(parseInt(maxPages, 10) || 50, 5), 500);
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const initialProgress: CrawlProgress = {
      step: 'validating',
      statusMessage: 'Initializing audit job...',
      pagesDiscovered: 1,
      pagesCrawled: 0,
      currentUrl: validation.normalizedUrl,
      percent: 0,
      recentLogs: [{ time: new Date().toLocaleTimeString(), message: 'Audit initialized', type: 'info' }],
    };

    const job: AuditJob = {
      id: jobId,
      url: validation.normalizedUrl,
      maxPages: pagesLimit,
      status: 'crawling',
      progress: initialProgress,
      createdAt: new Date().toISOString(),
    };

    AuditRepository.createJob(job);

    // Launch crawler in background
    const crawler = new CrawlerEngine(validation.normalizedUrl, pagesLimit, (progress) => {
      AuditRepository.updateJob(jobId, { progress });

      // Notify SSE subscribers
      const clients = sseClients.get(jobId);
      if (clients && clients.length > 0) {
        const payload = `data: ${JSON.stringify({ status: 'crawling', progress })}\n\n`;
        clients.forEach(client => client.write(payload));
      }
    });

    crawler.run().then(async (result) => {
      AuditRepository.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        result,
      });

      await AuditRepository.saveAudit(result);

      // Notify SSE subscribers of completion
      const clients = sseClients.get(jobId);
      if (clients && clients.length > 0) {
        const payload = `data: ${JSON.stringify({ status: 'completed', auditId: result.id })}\n\n`;
        clients.forEach(client => {
          client.write(payload);
          client.end();
        });
        sseClients.delete(jobId);
      }
    }).catch(err => {
      console.error(`Audit failed for ${validation.normalizedUrl}:`, err);
      const errorDetails: AuditErrorDetails = err instanceof AuditExecutionError
        ? err.details
        : {
            type: 'crawl_error',
            errorType: 'Audit Failed',
            reason: err.code || 'CRAWL_FAILED',
            message: err.message || 'Crawl execution failed',
            url: validation.normalizedUrl,
          };

      AuditRepository.updateJob(jobId, {
        status: 'failed',
        error: errorDetails.message,
        errorDetails,
      });

      const clients = sseClients.get(jobId);
      if (clients && clients.length > 0) {
        const payload = `data: ${JSON.stringify({ status: 'failed', error: errorDetails.message, errorDetails })}\n\n`;
        clients.forEach(client => {
          client.write(payload);
          client.end();
        });
        sseClients.delete(jobId);
      }
    });

    res.json({
      jobId,
      url: validation.normalizedUrl,
      maxPages: pagesLimit,
      status: 'crawling',
    });
  });

  // Check job progress (polling fallback)
  app.get('/api/audit/:id/status', (req, res) => {
    const job = AuditRepository.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({
      id: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      error: job.error,
      errorDetails: job.errorDetails,
      auditId: job.result ? job.result.id : undefined,
    });
  });

  // SSE stream for real-time progress
  app.get('/api/audit/:id/stream', (req, res) => {
    const jobId = req.params.id;
    const job = AuditRepository.getJob(jobId);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!sseClients.has(jobId)) {
      sseClients.set(jobId, []);
    }
    sseClients.get(jobId)!.push(res);

    // Send initial status immediately
    res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error, errorDetails: job.errorDetails, auditId: job.result?.id })}\n\n`);

    req.on('close', () => {
      const clients = sseClients.get(jobId);
      if (clients) {
        sseClients.set(jobId, clients.filter(c => c !== res));
      }
    });
  });

  // Get completed audit by ID
  app.get('/api/audit/:id', async (req, res) => {
    const audit = await AuditRepository.getAudit(req.params.id);
    if (!audit) {
      res.status(404).json({ error: 'Audit record not found' });
      return;
    }
    res.json(audit);
  });

  // List past audits
  app.get('/api/audits', async (req, res) => {
    const history = await AuditRepository.listAudits();
    res.json(history);
  });

  // Delete an audit
  app.delete('/api/audits/:id', async (req, res) => {
    const success = await AuditRepository.deleteAudit(req.params.id);
    res.json({ success });
  });

  // Export CSV
  app.get('/api/audit/:id/export/csv', async (req, res) => {
    const audit = await AuditRepository.getAudit(req.params.id);
    if (!audit) {
      res.status(404).send('Audit record not found');
      return;
    }

    const headers = [
      'URL',
      'Status Code',
      'Title',
      'Title Length',
      'Meta Description',
      'Meta Desc Length',
      'H1',
      'Word Count',
      'Text/HTML %',
      'Canonical URL',
      'Robots Noindex',
      'Incoming Internal Links',
      'Outgoing Internal Links',
      'Outgoing External Links',
      'Critical Issues',
      'Warnings',
    ];

    const rows = audit.pages.map(p => [
      `"${p.url.replace(/"/g, '""')}"`,
      p.statusCode,
      `"${p.title.text.replace(/"/g, '""')}"`,
      p.title.length,
      `"${p.metaDescription.text.replace(/"/g, '""')}"`,
      p.metaDescription.length,
      `"${(p.h1.text[0] || '').replace(/"/g, '""')}"`,
      p.wordCount,
      p.textToHtmlRatio,
      `"${(p.canonical.url || '').replace(/"/g, '""')}"`,
      p.robotsMeta.noindex ? 'YES' : 'NO',
      p.incomingInternalLinksCount,
      p.internalLinks.length,
      p.externalLinks.length,
      p.issuesCount.critical,
      p.issuesCount.warning,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fwsc-seo-audit-${audit.normalizedDomain}.csv"`);
    res.send(csvContent);
  });

  // Export JSON
  app.get('/api/audit/:id/export/json', async (req, res) => {
    const audit = await AuditRepository.getAudit(req.params.id);
    if (!audit) {
      res.status(404).json({ error: 'Audit record not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="fwsc-seo-audit-${audit.normalizedDomain}.json"`);
    res.send(JSON.stringify(audit, null, 2));
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FWSC (Free Website SEO Checker by digiVirus) Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
