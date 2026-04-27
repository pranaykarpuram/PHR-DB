import { Router } from 'express';
import { pool } from '../db.js';
import { EXAMPLE_PROMPTS } from '../assistant/catalog.js';
import { formatAnswer, cleanSql } from '../assistant/formatAnswer.js';
import { buildQuery } from '../assistant/queryBuilders.js';
import { matchedContextForControls, resolveQuestion } from '../assistant/resolver.js';

const router = Router();

function unsupportedResponse(res, reason, matchedContext = [], suggestions = EXAMPLE_PROMPTS) {
  return res.json({
    answer: reason,
    sql: '',
    params: [],
    metric: 'unsupported',
    rows: [],
    matchedContext,
    suggestions,
    unsupported: true,
  });
}

router.post('/ask', async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim();
    const hasControls = req.body?.controls && typeof req.body.controls === 'object';

    if (!question && !hasControls) {
      return unsupportedResponse(
        res,
        'Ask a question or choose guided controls to run an analytics query.'
      );
    }

    const resolved = question ? resolveQuestion(question) : null;
    const controls = hasControls ? req.body.controls : resolved?.controls;
    const matchedContext = hasControls
      ? matchedContextForControls(controls)
      : resolved?.matchedContext || [];

    if (resolved?.unsupported && !hasControls) {
      return unsupportedResponse(
        res,
        'I can only answer supported cohort, lab, condition, and medication analytics questions.',
        matchedContext,
        resolved.suggestions
      );
    }

    const built = buildQuery(controls);
    if (built.unsupported) {
      return unsupportedResponse(
        res,
        built.reason || 'That analytics request is not supported yet.',
        matchedContext,
        built.suggestions || EXAMPLE_PROMPTS
      );
    }

    const [rows] = await pool.execute(built.sql, built.params);
    const normalizedRows = rows.map((row) => ({ ...row }));

    res.json({
      answer: formatAnswer(built.metric, normalizedRows, built.description),
      sql: cleanSql(built.sql),
      params: built.params,
      metric: built.metric,
      rows: normalizedRows,
      matchedContext,
      suggestions: EXAMPLE_PROMPTS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to run analytics assistant query' });
  }
});

export default router;
