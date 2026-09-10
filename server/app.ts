import express from 'express';
import { sanitizeAndNormalizeUrl, resolveAndValidateDns } from './security';
import { AuditRepository } from './db';
import { CrawlerEngine, AuditExecutionError } from './crawler/crawlerEngine';
import type { AuditJob, CrawlProgress, AuditErrorDetails } from '../src/types';

// Map of active SSE client response objects by jobId
export const sseClients = new Map<string, express.Response[]>();

export function createExpressApp(): express.Express {
  const app = express();

  // 1. CORS Headers for production / preview / cross-origin deployments
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // 2. Body Parser
  app.use(express.json({ limit: '2mb' }));

  // 3. API Health Check
  app.get('/api/health', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      status: 'ok',
      brand: 'FWSC - Free Website SEO Checker by digiVirus',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 4. Start new audit
  app.post('/api/audit/start', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { url, maxPages } = req.body || {};

    // Validate and sanitize URL
    const validation = sanitizeAndNormalizeUrl(url);
    if (!validation.isValid) {
      res.status(400).json({
        error: validation.error || 'Invalid URL format.',
        errorDetails: {
          type: 'invalid_url',
          errorType: 'Invalid URL Format',
          reason: 'INVALID_URL',
          message: validation.error || 'The entered URL format is invalid. Please enter a valid website address.',
          url: url || '',
        },
      });
      return;
    }

    // DNS pre-check
    try {
      const parsed = new URL(validation.normalizedUrl);
      const dnsResult = await resolveAndValidateDns(parsed.hostname);
      if (!dnsResult.isValid) {
        res.status(400).json({
          error: dnsResult.message,
          errorDetails: {
            type: dnsResult.reason === 'SSRF_RESTRICTED_IP' ? 'restricted_ip' : 'dns_failed',
            errorType: dnsResult.errorType || 'Website Not Found',
            reason: dnsResult.reason || 'NXDOMAIN',
            message: dnsResult.message || 'Website Not Found: The domain does not exist or has no active DNS records.',
            url: validation.normalizedUrl,
          },
        });
        return;
      }
    } catch {
      res.status(400).json({
        error: 'Website Not Found: Could not resolve domain address.',
        errorDetails: {
          type: 'dns_failed',
          errorType: 'Website Not Found',
          reason: 'NXDOMAIN',
          message: 'Website Not Found: Could not resolve domain address. The website does not exist.',
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
        clients.forEach(client => {
          try {
            client.write(payload);
          } catch {
            // Ignore write errors if client disconnected
          }
        });
      }
    });

    crawler
      .run()
      .then(async (result) => {
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
            try {
              client.write(payload);
              client.end();
            } catch {
              // Ignore
            }
          });
          sseClients.delete(jobId);
        }
      })
      .catch((err) => {
        console.error(`Audit failed for ${validation.normalizedUrl}:`, err);
        const errorDetails: AuditErrorDetails =
          err instanceof AuditExecutionError
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
            try {
              client.write(payload);
              client.end();
            } catch {
              // Ignore
            }
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

  // 5. Check job progress (polling fallback)
  app.get('/api/audit/:id/status', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const job = AuditRepository.getJob(req.params.id);
    if (!job) {
      res.status(404).json({
        error: 'Job not found',
        errorDetails: {
          type: 'crawl_error',
          errorType: 'Job Not Found',
          reason: 'JOB_NOT_FOUND',
          message: `No active or recent audit job exists with ID "${req.params.id}".`,
          url: '',
        },
      });
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

  // 6. SSE stream for real-time progress
  app.get('/api/audit/:id/stream', (req, res) => {
    const jobId = req.params.id;
    const job = AuditRepository.getJob(jobId);

    if (!job) {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({
        error: 'Job not found',
        errorDetails: {
          type: 'crawl_error',
          errorType: 'Job Not Found',
          reason: 'JOB_NOT_FOUND',
          message: `No audit job exists with ID "${jobId}".`,
          url: '',
        },
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    if (!sseClients.has(jobId)) {
      sseClients.set(jobId, []);
    }
    sseClients.get(jobId)!.push(res);

    // Send initial status immediately
    res.write(
      `data: ${JSON.stringify({
        status: job.status,
        progress: job.progress,
        error: job.error,
        errorDetails: job.errorDetails,
        auditId: job.result?.id,
      })}\n\n`
    );

    req.on('close', () => {
      const clients = sseClients.get(jobId);
      if (clients) {
        sseClients.set(
          jobId,
          clients.filter((c) => c !== res)
        );
      }
    });
  });

  // 7. Get completed audit by ID
  app.get('/api/audit/:id', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const audit = await AuditRepository.getAudit(req.params.id);
    if (!audit) {
      res.status(404).json({
        error: 'Audit record not found',
        errorDetails: {
          type: 'crawl_error',
          errorType: 'Audit Record Not Found',
          reason: 'AUDIT_NOT_FOUND',
          message: `No completed audit record was found with ID "${req.params.id}".`,
          url: '',
        },
      });
      return;
    }
    res.json(audit);
  });

  // 8. List past audits
  app.get('/api/audits', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const history = await AuditRepository.listAudits();
    res.json(history);
  });

  // 9. Delete an audit
  app.delete('/api/audits/:id', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const success = await AuditRepository.deleteAudit(req.params.id);
    res.json({ success });
  });

  // 10. Export CSV
  app.get('/api/audit/:id/export/csv', async (req, res) => {
    const audit = await AuditRepository.getAudit(req.params.id);
    if (!audit) {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'Audit record not found' });
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

    const rows = audit.pages.map((p) => [
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

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fwsc-seo-audit-${audit.normalizedDomain}.csv"`);
    res.send(csvContent);
  });

  // 11. Export JSON
  app.get('/api/audit/:id/export/json', async (req, res) => {
    const audit = await AuditRepository.getAudit(req.params.id);
    if (!audit) {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'Audit record not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fwsc-seo-audit-${audit.normalizedDomain}.json"`);
    res.send(JSON.stringify(audit, null, 2));
  });

  // 12. Catch-all for undefined /api/* routes to ALWAYS return JSON (never Express HTML)
  app.all('/api/*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.path}`,
      errorDetails: {
        type: 'crawl_error',
        errorType: 'API Route Not Found',
        reason: 'ROUTE_NOT_FOUND',
        message: `The endpoint ${req.path} does not exist on this server.`,
        url: req.path,
        statusCode: 404,
      },
    });
  });

  // 13. Global Error Handler to ALWAYS return structured JSON instead of HTML stack trace
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.setHeader('Content-Type', 'application/json');
    const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal server error occurred',
      errorDetails: {
        type: 'server_error',
        errorType: 'Internal Server Error',
        reason: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred on the audit server.',
        url: req.path,
        statusCode: status,
      },
    });
  });

  return app;
}

const defaultApp = createExpressApp();
export default defaultApp;
